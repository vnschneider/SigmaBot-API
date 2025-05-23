import axios from "axios";
import dotenv from "dotenv";
import { FAQModel } from "../db/models/faq";
import { ChatModel } from "../db/models/chat";
import { Types } from "mongoose";
import crypto from "crypto";
import { ObjectId, ObjectIdLike } from "bson";
import { AdminManager } from "../../features/admin/admin.services";
import { STOP_WORDS } from "../../utils/utils";

dotenv.config();

// ======================
// CONSTANTES CONFIGURÁVEIS
// ======================
const API_TIMEOUT = 100000; // 5 minutos
const MAX_RETRIES = 2;
const MAX_TOKENS = 300; // Limite de tokens por resposta
const TEMPERATURE = 0.7; // Criatividade das respostas (0-1)
const MAX_FAQS_CONTEXT = 10; // Máximo de FAQs no contexto
const MAX_HISTORY_MESSAGES = 10; // Máximo de mensagens no histórico
const MAX_KEYWORDS = 5; // Máximo de keywords para busca
const MIN_WORD_LENGTH = 1; // Tamanho mínimo de palavras para keywords

// ======================
// TIPOS
// ======================
export interface ResponseWithContext {
  answer: string;
  contextFAQs: Types.ObjectId[];
  sessionId: string;
  executionTime?: number;
  transferToHuman?: boolean;
}

export class DeepSeekService {
  private static adminManager = new AdminManager();

  static async getResponse(
    userPhone: string,
    userQuestion: string,
    sessionId?: string,
    executionTime?: number
  ): Promise<ResponseWithContext> {
    const startTime = Date.now();
    let retryCount = 0;

    try {
      // 1. Gerenciamento de sessão otimizado
      const chatSession: any = await this.manageChatSession(
        userPhone,
        sessionId
      );

      if (!chatSession) {
        throw new Error("Falha ao criar ou recuperar sessão do chat.");
      }

      // NOVO: Verifica se já está aguardando atendente
      if (chatSession.waitingForHuman) {
        // Confirmação do usuário para transferência
        if (this.isConfirmation(userQuestion)) {
          await ChatModel.findByIdAndUpdate(chatSession._id, {
            $set: { waitingForHuman: false, transferredToHuman: true },
          });
          return {
            answer:
              "Certo! Vou transferir sua conversa para um atendente humano. Em breve alguém da equipe entrará em contato com você. 😊",
            contextFAQs: [],
            sessionId: chatSession.sessionId,
            executionTime: Date.now() - startTime,
            transferToHuman: true, // <-- Corrigido: sempre retorna true na confirmação
          };
        } else if (this.isCancel(userQuestion)) {
          await ChatModel.findByIdAndUpdate(chatSession._id, {
            $set: { waitingForHuman: false },
          });
          return {
            answer:
              "Ok, não vou transferir. Se precisar de um atendente, é só avisar!",
            contextFAQs: [],
            sessionId: chatSession.sessionId,
            executionTime: Date.now() - startTime,
            transferToHuman: false,
          };
        } else {
          return {
            answer:
              "Só para confirmar, você deseja mesmo falar com um atendente humano? (Responda 'sim' para confirmar ou 'não' para cancelar)",
            contextFAQs: [],
            sessionId: chatSession.sessionId,
            executionTime: Date.now() - startTime,
            transferToHuman: false,
          };
        }
      }

      // NOVO: Detecta pedido de atendimento humano
      if (this.isHumanRequest(userQuestion)) {
        await ChatModel.findByIdAndUpdate(chatSession._id, {
          $set: { waitingForHuman: true },
        });
        return {
          answer:
            "Você gostaria de ser atendido por um humano? Responda 'sim' para confirmar ou 'não' para continuar comigo.",
          contextFAQs: [],
          sessionId: chatSession.sessionId,
          executionTime: Date.now() - startTime,
          transferToHuman: false,
        };
      }

      // 2. Buscar histórico da sessão ativa
      const chatHistory = await ChatModel.findOne({
        sessionId: chatSession.sessionId,
      }).select("messages.context messages.content messages.sender -_id");

      // 3. Busca de FAQs com priorização
      const relevantFAQs = await FAQModel.find({
        $or: [
          { $text: { $search: userQuestion } },
          { _id: { $in: this.getPreviousContextIds(chatHistory) } },
          { tags: { $all: this.extractKeywords(userQuestion) } },
        ],
      })
        .sort({ score: { $meta: "textScore" } })
        .limit(MAX_FAQS_CONTEXT)
        .lean();

      // 4. Construção de contexto dinâmico
      const context = this.buildDynamicContext(
        relevantFAQs,
        chatHistory?.messages || []
      );

      // 5. Chamada à API com retry mechanism
      const response = await this.callAPIWithRetry(
        context,
        userQuestion,
        chatHistory?.messages || []
      );

      // 6. Atualização assíncrona da sessão
      await this.updateChatSession(chatSession, userQuestion, relevantFAQs);

      return {
        answer: response.data.choices[0].message.content,
        contextFAQs: relevantFAQs.map((faq) => faq._id as Types.ObjectId),
        sessionId: chatSession.sessionId,
        executionTime: Date.now() - startTime,
        transferToHuman: false,
      };
    } catch (error) {
      return this.handleError(error, startTime, sessionId);
    }
  }

  // ======================
  // MÉTODOS AUXILIARES
  // ======================
  private static async manageChatSession(
    userPhone: string,
    sessionId?: string
  ): Promise<any> {
    return ChatModel.findOneAndUpdate(
      { userPhone, ...(sessionId && { sessionId }), status: "active" },
      {
        $setOnInsert: {
          sessionId: sessionId || crypto.randomUUID(),
          userPhone,
          status: "active",
          createdAt: new Date(),
        },
        $set: { updatedAt: new Date() },
      },
      { new: true, upsert: !sessionId, setDefaultsOnInsert: true }
    ).lean();
  }

  private static getPreviousContextIds(chatHistory?: any): Types.ObjectId[] {
    return (
      chatHistory?.messages
        ?.flatMap((msg: { context: any }) => msg.context)
        ?.filter(
          (
            id:
              | string
              | number
              | ObjectId
              | Uint8Array<ArrayBufferLike>
              | ObjectIdLike
          ) => Types.ObjectId.isValid(id)
        ) || []
    );
  }

  private static async callAPIWithRetry(
    context: string,
    userQuestion: string,
    history: any[]
  ) {
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
      try {
        return await axios.post(
          "https://api.deepseek.com/v1/chat/completions",
          {
            model: "deepseek-chat",
            messages: this.buildMessageStack(context, userQuestion, history),
            temperature: TEMPERATURE,
            max_tokens: MAX_TOKENS,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: API_TIMEOUT,
          }
        );
      } catch (error) {
        retryCount++;
        if (retryCount >= MAX_RETRIES || !this.isRetryableError(error)) {
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retryCount))
        );
      }
    }
    throw new Error("Número máximo de tentativas excedido");
  }

  private static buildMessageStack(
    context: string,
    userQuestion: string,
    history: any[]
  ) {
    const systemMessage = {
      role: "system",
      content: `Você é a Rafa, atendente da Sigma Network. Contexto atual:\n${context}\n\n
        Diretrizes:
        1. Mantenha conversação natural usando histórico
        2. Refira-se a informações anteriores quando relevante
        3. Use emojis apenas para feedback positivo
        4. Exemplo: "Como mencionei antes, vamos verificar juntos... 🧐"`,
    };

    const validHistory = history
      .filter(
        (msg) =>
          msg.content?.trim() && ["user", "assistant"].includes(msg.sender)
      )
      .slice(-MAX_HISTORY_MESSAGES)
      .map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content.trim(),
      }));

    return [
      systemMessage,
      ...validHistory,
      {
        role: "user",
        content: userQuestion,
        metadata: { source: "user_input" },
      },
    ];
  }

  private static buildDynamicContext(faqs: any[], messageHistory: any[]) {
    const lastInteractionSummary =
      messageHistory
        .slice(-MAX_HISTORY_MESSAGES)
        .map(
          (msg) =>
            `${msg.sender === "user" ? "Cliente" : "Rafa"}: ${
              msg.content?.trim() || "(Mensagem não disponível)"
            }`
        )
        .join("\n") || "Nenhum histórico anterior";

    const knowledgeBase =
      faqs.length > 0
        ? faqs
            .slice(0, MAX_FAQS_CONTEXT)
            .map(
              (faq) =>
                `[FAQ-${faq._id}] Pergunta: ${faq.pergunta}\nResposta Base: ${faq.resposta}`
            )
            .join("\n\n")
        : "Base de conhecimento não encontrada para esta consulta";

    return `**Interações Recentes:**\n${lastInteractionSummary}\n\n**Base de Conhecimento:**\n${knowledgeBase}`;
  }

  private static extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\W+/)
      .filter((word) => word.length > MIN_WORD_LENGTH && !STOP_WORDS.has(word))
      .slice(0, MAX_KEYWORDS);
  }

  private static async updateChatSession(
    chatSession: any,
    userQuestion: string,
    relevantFAQs: any[]
  ) {
    try {
      await ChatModel.findByIdAndUpdate(
        chatSession._id,
        {
          $push: {
            messages: {
              content: userQuestion,
              sender: "user",
              context: relevantFAQs.map((faq) => faq._id),
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      );
    } catch (error) {
      console.error("Erro ao atualizar sessão:", error);
    }
  }

  private static handleError(
    error: any,
    startTime: number,
    sessionId?: string
  ): ResponseWithContext {
    const executionTime = Date.now() - startTime;
    console.error(`Erro após ${executionTime}ms:`, this.sanitizeError(error));

    if (this.isTimeoutError(error)) {
      return {
        answer:
          "Hmm, acho que pensei mais do que consigo te falar haha. O que você perguntou mesmo?",
        contextFAQs: [],
        sessionId: sessionId || crypto.randomUUID(),
        executionTime,
      };
    }

    if (this.isEmptyContextError(error)) {
      return {
        answer:
          "Parece que não encontrei informações sobre isso ainda. Poderia reformular ou perguntar algo diferente?",
        contextFAQs: [],
        sessionId: sessionId || crypto.randomUUID(),
        executionTime,
      };
    }

    return {
      answer:
        "Estou ajustando meus sistemas, por favor tente novamente em instantes! ⚙️",
      contextFAQs: [],
      sessionId:
        sessionId || "error-session-" + crypto.randomUUID().substring(0, 8),
      executionTime,
    };
  }

  private static isTimeoutError(error: any): boolean {
    return error.code === "ECONNABORTED" || error.message.includes("timeout");
  }

  private static isEmptyContextError(error: any): boolean {
    return error.response?.data?.error?.type === "invalid_request_error";
  }

  private static isRetryableError(error: any): boolean {
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600)
    );
  }

  private static sanitizeError(error: any) {
    if (!error) return error;

    return {
      message: error.message,
      code: error.code,
      config: error.config
        ? { url: error.config.url, method: error.config.method }
        : undefined,
      response: error.response ? { status: error.response.status } : undefined,
    };
  }

  // NOVO: Detecta frases de solicitação de atendimento humano
  private static isHumanRequest(text: string): boolean {
    const patterns = [
      /falar com (um )?(atendente|humano|pessoa|suporte|consultor)/i,
      /quero (ajuda|suporte|atendimento) humano/i,
      /preciso de (ajuda|suporte|atendente)/i,
      /transferir para (humano|atendente)/i,
      /posso falar com (algu[eé]m|um atendente)/i,
      /humano/i,
      /atendente/i,
      /suporte/i,
    ];
    return patterns.some((p) => p.test(text));
  }

  // NOVO: Detecta confirmação do usuário
  private static isConfirmation(text: string): boolean {
    return /^(sim|confirmo|quero|pode|ok|isso|claro|por favor)$/i.test(
      text.trim()
    );
  }

  // NOVO: Detecta cancelamento do usuário
  private static isCancel(text: string): boolean {
    return /^(não|nao|cancela|cancelar|desistir|parei)$/i.test(text.trim());
  }
}
