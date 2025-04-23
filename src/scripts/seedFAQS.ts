import { connectDB } from "../config/database";
import { FAQModel } from "../infrastructure/db/models/faq";
import fs from "fs";
import mongoose, { Types } from "mongoose";

// Função de normalização robusta
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^\w\s]/gi, "") // Remove pontuação
    .replace(/\s+/g, " ") // Espaços múltiplos para único
    .trim();
};

// Lista expandida de stop words
const STOP_WORDS = new Set([
  "a",
  "o",
  "as",
  "os",
  "ao",
  "aos",
  "da",
  "das",
  "do",
  "dos",
  "de",
  "em",
  "por",
  "para",
  "com",
  "sem",
  "sob",
  "sobre",
  "entre",
  "que",
  "como",
  "qual",
  "quais",
  "onde",
  "quando",
  "porque",
  "meu",
  "minha",
  "seus",
  "nossa",
  "isso",
  "qualquer",
  "quero",
  "preciso",
  "você",
  "sua",
  "ser",
  "estar",
  "ter",
  "há",
  "desde",
  "até",
  "após",
  "durante",
  "quanto",
  "também",
  "mas",
  "porém",
  "entretanto",
  "logo",
  "assim",
  "então",
  "desse",
  "dessa",
  "aquele",
  "aquela",
  "alguém",
  "algum",
  "alguns",
  "cada",
  "outro",
  "vários",
  "muito",
  "pouco",
  "mais",
  "menos",
  "grande",
  "pequeno",
  "fazer",
  "feito",
  "fazendo",
  "dizer",
  "dito",
  "fez",
  "diz",
  "sr",
  "sra",
  "senhor",
  "senhora",
  "att",
  "etc",
  "exemplo",
  "tipo",
  "dúvida",
  "ajuda",
  "por favor",
  "obrigado",
  "grato",
  "atenciosamente",
  "cordialmente",
  "solicito",
  "gostaria",
]);

connectDB();

async function importFAQs() {
  try {
    // 1. Ler e validar arquivo
    const rawData = fs.readFileSync("./src/scripts/faqs.json", "utf-8");
    const { faqs } = JSON.parse(rawData);

    if (!Array.isArray(faqs)) {
      throw new Error(
        "Formato inválido: O arquivo deve conter um array 'faqs'"
      );
    }

    if (faqs.length === 0) {
      console.log("⚠️  Nenhuma FAQ encontrada para importar");
      return;
    }

    // 2. Processar FAQs com normalização
    const processedFAQs = faqs.map((item, index) => {
      if (!item.pergunta || !item.resposta) {
        throw new Error(`FAQ na posição ${index} está incompleta`);
      }

      const normalized = normalizeString(item.pergunta);

      return {
        pergunta: item.pergunta.trim(),
        resposta: item.resposta.trim(),
        normalizedPergunta: normalized,
        tags: extractKeywords(item.pergunta),
        categoria: "Geral",
        variacoes: [],
        relevancia: 3,
        acessos: 0,
        relacionadas: [],
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        _id: new Types.ObjectId(),
      };
    });

    // 3. Verificar duplicatas no arquivo
    const uniqueFAQs = processedFAQs.filter(
      (faq, index, self) =>
        index ===
        self.findIndex((f) => f.normalizedPergunta === faq.normalizedPergunta)
    );

    const duplicatesInFile = processedFAQs.length - uniqueFAQs.length;

    // 4. Buscar FAQs existentes
    const existingFAQs = await FAQModel.find({});
    const existingNormalized = new Set(
      existingFAQs.map((f) => (f.toObject() as any).normalizedPergunta)
    );

    // 5. Filtrar FAQs realmente novas
    const newFAQs = uniqueFAQs.filter(
      (faq) => !existingNormalized.has(faq.normalizedPergunta)
    );

    // 6. Limpar banco se necessário
    if (existingFAQs.length > 0) {
      const { deletedCount } = await FAQModel.deleteMany({});
      console.log(`♻️  Removidas ${deletedCount} FAQs antigas`);
    }

    // 7. Inserir novas FAQs
    let insertedCount = 0;
    if (newFAQs.length > 0) {
      const result = await FAQModel.insertMany(newFAQs, { ordered: false });
      insertedCount = result.length;
    }

    // 8. Relatório final
    console.log(`
      ✅ Importação concluída!
      Total no arquivo: ${faqs.length}
      Processadas: ${processedFAQs.length}
      Duplicatas no arquivo: ${duplicatesInFile}
      Novas FAQs: ${insertedCount}
      Duplicatas no banco: ${newFAQs.length - insertedCount}
    `);
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ Erro crítico na importação:", error.message);
    } else {
      console.error("❌ Erro crítico na importação:", error);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect(); // Garante que a conexão seja fechada
    process.exit(0); // Encerra com código de sucesso
  }
}

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

importFAQs();
