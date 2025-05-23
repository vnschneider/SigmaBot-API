import { NextFunction, Request, Response, Router } from "express";
import { ChatModel } from "../../infrastructure/db/models/chat";
import { DeepSeekService } from "../../infrastructure/services/deep_seek_service";
import { verifyHMAC } from "../../utils/hmacAuth";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { FAQModel } from "../../infrastructure/db/models/faq";
import { Types } from "mongoose";
import { STOP_WORDS } from "../../utils/utils";
import { calculateMetrics } from "../../features/admin/metrics/metrics.service";
import { MenuLevel } from "../../features/admin/admin.types";

const router = Router();

// --- Utilitários do seedFAQS.ts (copiados/adaptados) ---
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
};

function extractKeywords(pergunta: string): string[] {
  const keywords = pergunta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\W+/)
    .filter(
      (word) => word.length > 2 && !STOP_WORDS.has(word) && !/\d/.test(word)
    )
    .slice(0, 5);

  return keywords.length > 0 ? keywords : ["geral"];
}

function generateVariations(pergunta: string): string[] {
  const base = normalizeString(pergunta);
  return [
    `Como posso ${base}?`,
    `De que forma ${base}?`,
    `Poderia me explicar ${base}?`,
    `Quais são os passos para ${base}?`,
    `O que devo fazer para ${base}?`,
  ];
}

function findRelatedFAQs(faq: any, allFAQs: any[]): Types.ObjectId[] {
  const related = allFAQs.filter(
    (other) =>
      other._id !== faq._id &&
      other.tags.some((tag: string) => faq.tags.includes(tag))
  );
  return related.map((r) => r._id);
}

// --- FIM dos utilitários ---

const faqsJsonPath = path.resolve(__dirname, "../../scripts/faqs.json");
function readFaqsJson() {
  const raw = fs.readFileSync(faqsJsonPath, "utf-8");
  return JSON.parse(raw);
}
function writeFaqsJson(faqsArr: any[]) {
  fs.writeFileSync(
    faqsJsonPath,
    JSON.stringify({ faqs: faqsArr }, null, 2),
    "utf-8"
  );
}

// Middleware de tratamento de erros
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({
      error: "JSON inválido no corpo da requisição",
      code: "INVALID_JSON",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
  next();
});

router.post("/typebot/generate-hmac", (req: Request, res) => {
  const secret = req.headers["x-secret-key"] as string;
  if (!secret) {
    return res.status(400).json({
      error: "Cabeçalho de autenticação ausente",
      code: "MISSING_AUTH_HEADER",
    });
  }

  const { phone, text } = req.body;
  if (!phone || !text) {
    return res.status(400).json({
      error: "Dados incompletos para geração de HMAC",
      required_fields: ["phone", "text"],
    });
  }

  try {
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify({ phone, text }))
      .digest("hex");

    res.json({
      hmac,
      expires_in: 300, // 5 minutos
      algorithm: "SHA256",
    });
  } catch (error) {
    console.error("Erro na geração de HMAC:", error);
    res.status(500).json({
      error: "Falha interna na geração de assinatura",
      code: "HMAC_GENERATION_FAILURE",
    });
  }
});

router.post("/typebot/webhook", async (req: Request, res) => {
  try {
    if (!verifyHMAC(req)) {
      return res.status(403).json({
        error: "Assinatura HMAC inválida ou expirada",
        code: "INVALID_HMAC",
      });
    }

    const { phone, text, sessionId } = req.body;

    // Validação aprimorada
    if (!phone || !/^\+\d{11,14}$/.test(phone)) {
      return res.status(400).json({
        error: "Número de telefone inválido",
        code: "INVALID_PHONE_FORMAT",
      });
    }

    if (!text || text.length < 1) {
      return res.status(400).json({
        error: "Mensagem muito curta (mínimo 1 caractere)",
        code: "SHORT_MESSAGE",
      });
    }

    // Processamento principal
    const {
      answer,
      contextFAQs,
      sessionId: finalSessionId,
      transferToHuman,
    } = await DeepSeekService.getResponse(phone, text, sessionId);

    // Atualização atômica da sessão
    const updatedChat = await ChatModel.findOneAndUpdate(
      {
        sessionId: finalSessionId,
        userPhone: phone,
        status: "active",
      },
      {
        $push: {
          messages: {
            $each: [
              {
                content: text,
                sender: "user",
                context: contextFAQs,
                timestamp: new Date(),
              },
              {
                content: answer,
                sender: "assistant",
                context: contextFAQs,
                timestamp: new Date(),
              },
            ],
          },
        },
        $set: {
          updatedAt: new Date(),
          status: "active",
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      resposta: answer,
      sessionId: updatedChat.sessionId,
      metadata: {
        faqs_utilizados: contextFAQs,
        timestamp: new Date().toISOString(),
        transferToHuman,
      },
    });
  } catch (error) {
    console.error("Erro completo:", error);

    // Rollback em caso de erro crítico
    if (
      typeof error === "object" &&
      error !== null &&
      "isCritical" in error &&
      error.isCritical
    ) {
      await ChatModel.updateOne(
        { sessionId: (error as any).sessionId },
        { $pull: { messages: { content: (error as any).failedMessage } } }
      );
    }

    res.status(500).json({
      error: "Falha no processamento",
      code: "PROCESS_FAILURE",
      sessionId: (error as any)?.sessionId || "unknown",
      retry_url: "/api/typebot/webhook/retry",
    });
  }
});

router.post("/chats/:id/close", async (req, res) => {
  const chat = await ChatModel.findByIdAndUpdate(
    req.params.id,
    {
      status: "closed",
      closedAt: new Date(),
      closeReason: "manual",
    },
    { new: true }
  );

  res.json(chat);
});

// Listar todas as FAQs
router.get("/faqs", async (req, res) => {
  const faqs = await FAQModel.find({});
  res.json(faqs);
});

// Pesquisar FAQ por assunto (campo pergunta)
router.get("/faqs/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Parâmetro 'q' obrigatório" });
  const faqs = await FAQModel.find({
    pergunta: { $regex: q as string, $options: "i" },
  });
  res.json(faqs);
});

// Adicionar nova FAQ (processa igual ao seed, salva no banco e no faqs.json)
router.post("/faqs", async (req, res) => {
  const { pergunta, resposta } = req.body;
  if (!pergunta || !resposta) {
    return res
      .status(400)
      .json({ error: "Campos 'pergunta' e 'resposta' são obrigatórios" });
  }

  // Processamento igual ao seed
  const normalized = normalizeString(pergunta);
  const tags = extractKeywords(pergunta);
  const variacoes = generateVariations(pergunta);
  const faqObj = {
    pergunta: pergunta.trim(),
    resposta: resposta.trim(),
    normalizedPergunta: normalized,
    tags,
    categoria: "Geral",
    variacoes,
    relevancia: 3,
    acessos: 0,
    relacionadas: [],
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };

  // Salva no banco
  const faqDoc = await FAQModel.create(faqObj);

  // Atualiza relacionadas (apenas para o novo, para não reprocessar tudo)
  const allFAQs = await FAQModel.find({});
  faqDoc.relacionadas = findRelatedFAQs(faqDoc, allFAQs);
  await faqDoc.save();

  // Atualiza faqs.json
  const faqsFile = readFaqsJson();
  faqsFile.faqs.push({ pergunta: faqObj.pergunta, resposta: faqObj.resposta });
  writeFaqsJson(faqsFile.faqs);

  res.status(201).json(faqDoc);
});

// Excluir uma FAQ por ID (remove do banco e do faqs.json)
router.delete("/faqs/:id", async (req, res) => {
  const { id } = req.params;
  const faq = await FAQModel.findByIdAndDelete(id);
  if (!faq) return res.status(404).json({ error: "FAQ não encontrada" });

  // Remove do faqs.json
  const faqsFile = readFaqsJson();
  const idx = faqsFile.faqs.findIndex(
    (f: any) => f.pergunta === faq.pergunta && f.resposta === faq.resposta
  );
  if (idx !== -1) {
    faqsFile.faqs.splice(idx, 1);
    writeFaqsJson(faqsFile.faqs);
  }

  res.json({ success: true });
});

// Limpar toda a coleção de FAQs (apenas o banco, NÃO limpa faqs.json)
router.delete("/faqs", async (req, res) => {
  await FAQModel.deleteMany({});
  res.json({ success: true });
});

// Sincronizar FAQs do banco com faqs.json (banco -> arquivo, estrutura simples igual faqs.json)
router.post("/faqs/sync-to-json", async (req, res) => {
  const faqs = await FAQModel.find({}).select("pergunta resposta -_id").lean();
  writeFaqsJson(faqs);
  res.json({ success: true, total: faqs.length });
});

// Sincronizar FAQs do faqs.json para o banco (arquivo -> banco, processando igual seed)
router.post("/faqs/sync-to-db", async (req, res) => {
  const faqsFile = readFaqsJson();
  if (!Array.isArray(faqsFile.faqs))
    return res.status(400).json({ error: "faqs.json inválido" });

  // Remove duplicadas pelo campo pergunta (case-insensitive, trim)
  const seen = new Set<string>();
  const processedFAQs: any[] = [];
  for (const item of faqsFile.faqs) {
    if (!item.pergunta || !item.resposta) continue;
    const key = item.pergunta.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      const normalized = normalizeString(item.pergunta);
      // Gere um _id manualmente para cada FAQ, igual ao seed
      processedFAQs.push({
        pergunta: item.pergunta.trim(),
        resposta: item.resposta.trim(),
        normalizedPergunta: normalized,
        tags: extractKeywords(item.pergunta),
        categoria: "Geral",
        variacoes: generateVariations(item.pergunta),
        relevancia: 3,
        acessos: 0,
        relacionadas: [] as Types.ObjectId[],
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        _id: new Types.ObjectId(), // Adiciona _id manualmente
      });
    }
  }

  // Relacionadas (agora todos têm _id)
  for (const faq of processedFAQs) {
    faq.relacionadas = findRelatedFAQs(faq, processedFAQs) as Types.ObjectId[];
  }

  await FAQModel.deleteMany({});
  await FAQModel.insertMany(processedFAQs);

  res.json({ success: true, total: processedFAQs.length });
});

// Endpoint provisório para métricas do sistema (para uso via Swagger)
router.get("/admin/metrics", async (req, res) => {
  try {
    const metrics = await calculateMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: "Erro ao obter métricas",
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;
