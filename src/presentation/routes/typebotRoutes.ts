import { NextFunction, Request, Response, Router } from "express";
import { ChatModel } from "../../infrastructure/db/models/chat";
import { DeepSeekService } from "../../infrastructure/services/deep_seek_service";
import { verifyHMAC } from "../../utils/hmacAuth";
import crypto from "crypto";
import { Z_FILTERED } from "zlib";

const router = Router();

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

    if (!text || text.length < 3) {
      return res.status(400).json({
        error: "Mensagem muito curta (mínimo 3 caracteres)",
        code: "SHORT_MESSAGE",
      });
    }

    // Processamento principal
    const {
      answer,
      contextFAQs,
      sessionId: finalSessionId,
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

export default router;
