// src/features/admin/faqs/faqs.utils.ts
import { Types } from "mongoose";
import { IFAQ } from "../../../infrastructure/db/models/faq";
import { FAQCreateInput, FAQUpdateInput, FAQSearchResult } from "./faqs.types";
import { FAQSessionContext } from "./faqs.types";

// Validação de conteúdo de FAQ
export function validateFAQContent(content: string): {
  isValid: boolean;
  data?: FAQCreateInput;
  errors: string[];
} {
  const errors: string[] = [];
  const result: Partial<FAQCreateInput> = {};

  // Extrai pergunta e resposta
  const perguntaMatch = content.match(/P:(.+?)(\n|$)/i);
  const respostaMatch = content.match(/R:(.+?)(\n|$)/i);

  if (!perguntaMatch) errors.push("Formato de pergunta inválido (use 'P:')");
  if (!respostaMatch) errors.push("Formato de resposta inválido (use 'R:')");

  if (perguntaMatch) result.pergunta = perguntaMatch[1].trim();
  if (respostaMatch) result.resposta = respostaMatch[1].trim();

  // Extrai tags (opcional)
  const tagsMatch = content.match(/T:(.+?)(\n|$)/i);
  if (tagsMatch) {
    result.tags = tagsMatch[1]
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);
  } else {
    result.tags = [];
  }

  // Extrai categoria (opcional)
  const categoriaMatch = content.match(/C:(.+?)(\n|$)/i);
  if (categoriaMatch) {
    const categoria = categoriaMatch[1].trim();
    if (isValidCategory(categoria)) {
      result.categoria = categoria;
    } else {
      errors.push(`Categoria inválida: ${categoria}`);
    }
  }

  return {
    isValid: errors.length === 0,
    data: result as FAQCreateInput,
    errors,
  };
}

// Validador de categorias
const validCategories = [
  "Técnico",
  "Financeiro",
  "Plano",
  "Cadastro",
  "Segurança",
  "Pagamento",
  "Suporte",
  "Recursos",
  "Conta",
  "Privacidade",
  "Geral",
  "Outros",
];

function isValidCategory(categoria: string): boolean {
  return validCategories.includes(categoria);
}

// Formatador de resultados para exibição
export function formatFAQForDisplay(faq: IFAQ | FAQSearchResult): string {
  return (
    `ID: ${faq._id}\n` +
    `[${faq.categoria || "Geral"}] ${
      faq.relevancia ? "★".repeat(faq.relevancia) + " " : ""
    }\n` +
    `P: ${faq.pergunta}\n` +
    `R: ${faq.resposta}\n` +
    ("tags" in faq && faq.tags?.length
      ? `Tags: ${faq.tags.join(", ")}\n`
      : "") +
    `═══`
  );
}

// Validador de IDs
export function isValidFAQId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}
