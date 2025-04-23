import { ChatModel } from "../infrastructure/db/models/chat";
import axios from "axios";

export class ChatWorker {
  private readonly INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutos
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos
  private readonly NOTIFICATION_TIMEOUT = 10 * 1000; // 10 segundos para envio

  constructor() {
    this.initialize().catch((err) => {
      console.error("❌ Falha crítica ao iniciar worker:", err);
      process.exit(1);
    });
  }

  private async initialize() {
    try {
      console.log("⏳ Iniciando worker de chats...");

      await this.processInactiveChats();

      setInterval(() => {
        this.processInactiveChats().catch((err) =>
          console.error("Erro no ciclo do worker:", err)
        );
      }, this.CHECK_INTERVAL);

      console.log(
        `✅ Worker ativo. Verificando a cada ${
          this.CHECK_INTERVAL / 60000
        } minutos`
      );
    } catch (error) {
      console.error("❌ Falha na inicialização do worker:", error);
      throw error;
    }
  }

  private async processInactiveChats() {
    const startTime = Date.now();
    console.log("\n🔍 Iniciando verificação de chats inativos...");

    try {
      const inactiveChats = await ChatModel.find({
        status: "active",
        updatedAt: { $lt: new Date(Date.now() - this.INACTIVITY_THRESHOLD) },
        "messages.0": { $exists: true },
      }).lean();

      console.log(`📊 ${inactiveChats.length} chats inativos encontrados`);

      for (const [index, chat] of inactiveChats.entries()) {
        console.log(
          `\n🔄 Processando chat ${index + 1}/${inactiveChats.length}: ${
            chat._id
          }`
        );
        await this.notifyAndCloseChat(chat);
      }

      console.log(
        `\n🎯 Verificação concluída em ${(Date.now() - startTime) / 1000}s`
      );
    } catch (error) {
      console.error("⚠️ Erro durante o processamento:", error);
    }
  }

  private async notifyAndCloseChat(chat: any) {
    const startTime = Date.now();

    try {
      console.log(`   ✉️ Enviando notificação para ${chat.userPhone}...`);
      await this.sendNotification(
        chat.userPhone,
        "ℹ️ O chat será finalizado por inatividade. Se precisar de mais ajuda, envie uma nova mensagem!",
        chat.sessionId
      );

      console.log(`   🔒 Fechando chat ${chat._id}...`);
      await ChatModel.updateOne(
        { _id: chat._id },
        {
          status: "closed",
          closedAt: new Date(),
          closeReason: "inactivity",
          $push: {
            statusHistory: {
              status: "closed",
              changedAt: new Date(),
              reason: "inactivity_auto_close",
            },
          },
        }
      );

      console.log(`   ✔️ Sucesso (${(Date.now() - startTime) / 1000}s)`);
    } catch (error) {
      console.error(
        `   ❌ Falha no processamento do chat ${chat._id}:`,
        error instanceof Error ? error.message : error
      );

      await ChatModel.updateOne(
        { _id: chat._id },
        {
          $push: {
            errors: {
              type: "auto_close_failed",
              message:
                error instanceof Error ? error.message : "Erro desconhecido",
              timestamp: new Date(),
            },
          },
        }
      );
    }
  }

  private async sendNotification(
    phone: string,
    message: string,
    sessionId: string
  ) {
    try {
      await Promise.race([
        axios.post(
          `${process.env.MESSAGING_API_URL}/notify`,
          {
            phone,
            message,
            sessionId,
            type: "inactivity_warning",
          },
          {
            timeout: this.NOTIFICATION_TIMEOUT,
          }
        ),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout ao enviar notificação")),
            this.NOTIFICATION_TIMEOUT
          )
        ),
      ]);
    } catch (error) {
      console.error(
        "   🚨 Erro no envio de notificação:",
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }
}
