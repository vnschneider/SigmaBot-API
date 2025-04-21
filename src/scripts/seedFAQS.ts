import { connectDB } from "../config/database";
import { FAQModel } from "../infrastructure/db/models/faq";
import fs from "fs";

connectDB();

async function importFAQs() {
  const rawData = fs.readFileSync("./src/scripts/faqs.json", "utf-8");
  const { faq } = JSON.parse(rawData);

  const faqsWithTags = faq.map((item: any) => ({
    ...item,
    tags: item.pergunta.toLowerCase().match(/\b(\w+)\b/g) || [],
  }));

  await FAQModel.deleteMany({});
  await FAQModel.insertMany(faqsWithTags);
  console.log(`✅ ${faqsWithTags.length} FAQs importadas para o MongoDB!`);
}

importFAQs();
