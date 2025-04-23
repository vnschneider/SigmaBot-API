// src/features/admin/faqs/faqs.search.ts
import { FAQModel, IFAQ } from "../../../infrastructure/db/models/faq";
import { FAQSearchResult } from "./faqs.types";

export async function searchFAQs(
  query: string,
  options: {
    limit?: number;
    minRelevancy?: number;
    category?: string;
  } = {}
): Promise<FAQSearchResult[]> {
  const { limit = 5, minRelevancy = 1, category } = options;

  const searchQuery: any = {
    $text: { $search: query },
    relevancia: { $gte: minRelevancy },
  };

  if (category) {
    searchQuery.categoria = category;
  }

  return FAQModel.find(searchQuery)
    .select("pergunta resposta categoria relevancia tags")
    .sort({ relevancia: -1, score: { $meta: "textScore" } })
    .limit(limit)
    .lean()
    .exec();
}
