// src/features/admin/faqs/faqs.validators.ts
import { FAQModel } from "../../../infrastructure/db/models/faq";

export async function validateNewFaq(
  pergunta: string,
  resposta: string
): Promise<string[]> {
  const errors: string[] = [];

  if (pergunta.length < 5) {
    errors.push("Pergunta muito curta (mínimo 5 caracteres)");
  }

  if (resposta.length < 10) {
    errors.push("Resposta muito curta (mínimo 10 caracteres)");
  }

  const exists = await FAQModel.exists({ pergunta });
  if (exists) {
    errors.push("Já existe uma FAQ com esta pergunta");
  }

  return errors;
}

export async function validateUpdatedFaq(
  id: string,
  pergunta: string
): Promise<string[]> {
  const errors: string[] = [];

  const existing = await FAQModel.findOne({
    pergunta,
    _id: { $ne: id },
  });

  if (existing) {
    errors.push("Já existe outra FAQ com esta pergunta");
  }

  return errors;
}
