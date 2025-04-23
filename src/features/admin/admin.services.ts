// src/features/admin/admin.service.ts
import { AdminSession, MenuLevel } from "./admin.types";
import * as AuthService from "./auth/auth.service";
import * as FaqService from "./faqs/faqs.service";
import * as MetricsService from "./metrics/metrics.service";
import * as PersonaService from "./persona/persona.service";
import { ResponseWithContext } from "../../infrastructure/services/deep_seek_service";
import { FAQSessionContext } from "./faqs/faqs.types";

export class AdminManager {
  private activeSessions: Map<string, AdminSession> = new Map();

  isAdminSession(sessionId?: string): boolean {
    return sessionId ? this.activeSessions.has(sessionId) : false;
  }

  async handleAdminCommand(
    userPhone: string,
    message: string,
    sessionId: string
  ): Promise<ResponseWithContext> {
    try {
      // Verificação de autenticação
      if (message.startsWith("SigmaBot config:")) {
        const authResult = await AuthService.handleAuthInitial(
          userPhone,
          message,
          sessionId
        );
        if (authResult.authenticated) {
          this.activeSessions.set(sessionId, {
            sessionId,
            userPhone,
            currentMenu: MenuLevel.MAIN,
            accessLevel: authResult.accessLevel ?? "standard",
            createdAt: new Date(),
            lastActivity: new Date(),
            awaitingPersonaInput: undefined,
            awaitSearchTerm: undefined,
          });
        }
        return this.buildResponse(authResult.message, { sessionId });
      }

      // Verifica sessão ativa
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return this.buildResponse(
          "🔒 Sessão expirada. Use 'SigmaBot config:sua_chave' para autenticar."
        );
      }

      // Atualiza última atividade
      session.lastActivity = new Date();

      // Roteamento para submenus
      switch (session.currentMenu) {
        case MenuLevel.MAIN:
          return this.handleMainMenu(message, session);
        case MenuLevel.AUTH:
          AuthService.handleAuthMenu(message, session);
        case MenuLevel.FAQS:
          return FaqService.handleFAQMenu(message, session);
        case MenuLevel.METRICS:
          return MetricsService.handleMetricsMenu(message, session);
        case MenuLevel.PERSONA:
          PersonaService.handlePersonaMenu(message, session);
        default:
          return this.buildResponse("⚠️ Opção inválida", { sessionId });
      }
    } catch (error) {
      console.error("Erro no AdminManager:", error);
      return this.buildResponse("❌ Ocorreu um erro no processamento", {
        sessionId,
      });
    }
  }

  private async handleMainMenu(message: string, session: AdminSession) {
    const response: Partial<ResponseWithContext> = {
      sessionId: session.sessionId,
    };

    switch (message) {
      case "1":
        session.currentMenu = MenuLevel.METRICS;
        return MetricsService.getServiceOverview(session);
      case "2":
        if (session.accessLevel === "master") {
          session.currentMenu = MenuLevel.AUTH;
          Object.assign(response, await AuthService.getAuthMenu(session));
        } else {
          response.answer =
            "❌ Apenas administradores master podem acessar este menu";
        }
        break;
      case "3":
        session.currentMenu = MenuLevel.FAQS;
        Object.assign(response, await FaqService.getFaqMenu(session));
        break;
      case "4":
        session.currentMenu = MenuLevel.PERSONA;
        Object.assign(response, await PersonaService.getPersonaMenu(session));
        break;
      case "0":
        this.activeSessions.delete(session.sessionId);
        response.answer = "🐱‍🏍 Modo admin desativado. Até logo!";
        break;
      default:
        Object.assign(response, this.getMainMenu(session));
    }

    return response as ResponseWithContext;
  }

  private getMainMenu(session: AdminSession): ResponseWithContext {
    let menu = "🐱‍👤 *Menu Principal Admin*\n\n";
    menu += "1. 📊 Métricas do Serviço\n";
    menu += "2. 🔑 Gerenciar Autenticação\n";
    menu += "3. 📚 Gerenciar FAQs\n";
    menu += "4. 🎭 Configurar Persona\n";
    menu += "0. 🚪 Sair";

    return this.buildResponse(menu, { sessionId: session.sessionId });
  }

  private buildResponse(
    message: string,
    options: Partial<ResponseWithContext> = {}
  ): ResponseWithContext {
    return {
      answer: message,
      contextFAQs: [],
      sessionId: options.sessionId || crypto.randomUUID(),
      executionTime: 0,
      ...options,
    };
  }
}
