// src/features/admin/faqs/faqs.relations.ts
import { FAQModel } from "../../../infrastructure/db/models/faq";
import { Types } from "mongoose";

export async function relateFAQs(
  sourceId: Types.ObjectId,
  targetId: Types.ObjectId
): Promise<{ success: boolean; message: string }> {
  if (sourceId.equals(targetId)) {
    return {
      success: false,
      message: "Não é possível relacionar uma FAQ com ela mesma",
    };
  }

  const [source, target] = await Promise.all([
    FAQModel.findById(sourceId),
    FAQModel.findById(targetId),
  ]);

  if (!source || !target) {
    return {
      success: false,
      message: "Uma ou ambas as FAQs não foram encontradas",
    };
  }

  // Adiciona relação bidirecional
  await Promise.all([
    FAQModel.findByIdAndUpdate(sourceId, {
      $addToSet: { relacionadas: targetId },
    }),
    FAQModel.findByIdAndUpdate(targetId, {
      $addToSet: { relacionadas: sourceId },
    }),
  ]);

  return {
    success: true,
    message: `FAQ ${sourceId} relacionada com ${targetId} com sucesso!`,
  };
}
