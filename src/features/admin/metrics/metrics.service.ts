// src/features/admin/metrics/metrics.service.ts
import { AdminSession, MenuLevel } from "../admin.types";
import { ChatModel } from "../../../infrastructure/db/models/chat";
import { FAQModel } from "../../../infrastructure/db/models/faq";
import { AdminActivityModel } from "../../../infrastructure/db/models/admin/adminActivity";
import { ResponseWithContext } from "../../../infrastructure/services/deep_seek_service";

export async function getServiceOverview(
  session: AdminSession
): Promise<ResponseWithContext> {
  try {
    const metrics = await calculateMetrics();
    await logAdminActivity(session, "view_metrics");

    return {
      answer: formatMetricsResponse(metrics),
      contextFAQs: [],
      sessionId: session.sessionId,
      executionTime: 0,
    };
  } catch (error) {
    console.error("Erro ao calcular métricas:", error);
    return {
      answer: "❌ Erro ao obter métricas do sistema",
      contextFAQs: [],
      sessionId: session.sessionId,
      executionTime: 0,
    };
  }
}

export async function handleMetricsMenu(
  message: string,
  session: AdminSession
): Promise<ResponseWithContext> {
  if (message.toLowerCase() === "voltar") {
    session.currentMenu = "main" as MenuLevel;
    return {
      answer: "Retornando ao menu principal...",
      contextFAQs: [],
      sessionId: session.sessionId,
      executionTime: 0,
    };
  }

  // Aqui você pode adicionar mais opções específicas do menu de métricas
  return getServiceOverview(session);
}

export async function calculateMetrics() {
  const [activeChats, totalFaqs, totalActivities] = await Promise.all([
    ChatModel.countDocuments({ status: "active" }),
    FAQModel.countDocuments(),
    AdminActivityModel.countDocuments(),
    // Adicione outras métricas conforme necessário
  ]);

  return {
    activeChats,
    totalFaqs,
    totalActivities,
    uptime: formatUptime(process.uptime()),
    memoryUsage: process.memoryUsage().rss / 1024 / 1024, // Em MB
  };
}

function formatMetricsResponse(metrics: any): string {
  return (
    `📊 *Métricas do Sistema*\n\n` +
    `• 💬 Chats ativos: ${metrics.activeChats}\n` +
    `• 📚 FAQs cadastradas: ${metrics.totalFaqs}\n` +
    `• 📝 Atividades admin: ${metrics.totalActivities}\n` +
    `• ⏱️ Uptime: ${metrics.uptime}\n` +
    `• 🖥️ Uso de memória: ${metrics.memoryUsage.toFixed(2)} MB\n\n` +
    `Digite "voltar" para retornar`
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24));
  seconds %= 3600 * 24;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);

  return `${days}d ${hours}h ${minutes}m`;
}

async function logAdminActivity(session: AdminSession, action: string) {
  // Garante que adminId seja um ObjectId válido ou, se não for, usa um ObjectId fake para evitar erro de required
  let adminId: any = session.userPhone;
  if (!/^[a-f\d]{24}$/i.test(adminId)) {
    // Usa um ObjectId fake para logs técnicos (ex: swagger)
    adminId = new (require("mongoose").Types.ObjectId)();
  }
  await AdminActivityModel.create({
    adminId,
    action,
    timestamp: new Date(),
  });
}
