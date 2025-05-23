import { STOP_WORDS } from "../utils/utils";
import { connectDB } from "../config/database";
import { FAQModel } from "../infrastructure/db/models/faq";
import fs from "fs";
import mongoose, { Types } from "mongoose";

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
};



connectDB();

async function importFAQs() {
  try {
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
        variacoes: generateVariations(item.pergunta),
        relevancia: 3,
        acessos: 0,
        relacionadas: [] as Types.ObjectId[],
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        _id: new Types.ObjectId(),
      };
    });

    // Adicionar FAQs relacionadas
    for (const faq of processedFAQs) {
      faq.relacionadas = findRelatedFAQs(faq, processedFAQs);
    }

    const uniqueFAQs = processedFAQs.filter(
      (faq, index, self) =>
        index ===
        self.findIndex((f) => f.normalizedPergunta === faq.normalizedPergunta)
    );

    const duplicatesInFile = processedFAQs.length - uniqueFAQs.length;

    const existingFAQs = await FAQModel.find({});
    const existingNormalized = new Set(
      existingFAQs.map((f) => (f.toObject() as any).normalizedPergunta)
    );

    const newFAQs = uniqueFAQs.filter(
      (faq) => !existingNormalized.has(faq.normalizedPergunta)
    );

    if (existingFAQs.length > 0) {
      const { deletedCount } = await FAQModel.deleteMany({});
      console.log(`♻️  Removidas ${deletedCount} FAQs antigas`);
    }

    let insertedCount = 0;
    if (newFAQs.length > 0) {
      const result = await FAQModel.insertMany(newFAQs, { ordered: false });
      insertedCount = result.length;
    }

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
    await mongoose.disconnect();
    process.exit(0);
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

importFAQs();
