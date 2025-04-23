// src/features/admin/faqs/faqs.service.ts
import { FAQModel } from "../../../infrastructure/db/models/faq";
import {
  FAQSessionContext,
  FAQOperationResponse,
  FAQCreateInput,
} from "./faqs.types";
import {
  validateFAQContent,
  formatFAQForDisplay,
  isValidFAQId,
} from "./faqs.utils";
import { ResponseWithContext } from "../../../infrastructure/services/deep_seek_service";
import { ObjectId, Types } from "mongoose";

export async function getFaqMenu(
  session: FAQSessionContext
): Promise<ResponseWithContext> {
  return {
    answer: buildFAQMenuText(),
    contextFAQs: [],
    sessionId: session.sessionId,
  };
}

function buildFAQMenuText(): string {
  return (
    `📚 *Menu de FAQs*\n\n` +
    `1. 🔍 Pesquisar FAQ\n` +
    `2. 📝 Adicionar FAQ\n` +
    `3. ✏️ Editar FAQ\n` +
    `4. 🗑️ Remover FAQ\n` +
    `5. 🔗 Relacionar FAQs\n` +
    `6. 📊 Estatísticas\n` +
    `9. ↩️ Voltar`
  );
}

export  async function handleFAQMenu(
    message: string,
    session: FAQSessionContext
  ): Promise<ResponseWithContext> {
    switch (message) {
      case '1':
        session.faqAction = 'search';
        return {
          answer: "🔍 Digite sua pesquisa (ou use filtros):\nEx: 'erro login C:Técnico R:3'",
          contextFAQs: [],
          sessionId: session.sessionId
        };
      case '2':
        session.faqAction = 'add';
        return {
          answer: "📝 Formato esperado:\nP: Pergunta\nR: Resposta\nT: tag1,tag2\nC: Categoria\nV: variação1;variação2",
          contextFAQs: [],
          sessionId: session.sessionId
        };   
      default:
        return {
          answer: "⚠️ Opção inválida. Por favor, escolha uma opção válida do menu FAQ.",
          contextFAQs: [],
          sessionId: session.sessionId
        };
    }
  }

export async function handleAddFAQ(
  content: string,
  session: FAQSessionContext
): Promise<ResponseWithContext> {
  const validation = validateFAQContent(content);

  if (!validation.isValid) {
    return buildErrorResponse(validation.errors, session);
  }

  try {
    const faqData: FAQCreateInput = {
      ...validation.data!,
      relevancia: validation.data!.relevancia || 3,
      categoria: validation.data!.categoria || "Geral",
    };

    const newFAQ = await FAQModel.create(faqData);

    return {
      answer: `✅ FAQ criada com sucesso!\n${formatFAQForDisplay(newFAQ)}`,
      contextFAQs: [newFAQ._id] as Types.ObjectId[] ,
      sessionId: session.sessionId,
    };
  } catch (error) {
    return buildErrorResponse([(error as Error).message], session);
  }
}

// Helper functions
function buildErrorResponse(
  errors: string[],
  session: FAQSessionContext
): ResponseWithContext {
  return {
    answer: `❌ Erros:\n${errors.join("\n")}`,
    contextFAQs: [],
    sessionId: session.sessionId,
  };
}
