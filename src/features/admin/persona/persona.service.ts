// src/features/admin/persona/persona.service.ts
import { AdminSession, MenuLevel } from "../admin.types";
import { logAdminActivity } from "../auth/auth.utils";
import { PersonaConfig, PartialPersonaConfig, defaultPersonaConfig } from "./persona.types";

let currentConfig: PersonaConfig = { ...defaultPersonaConfig };

export function getPersonaMenu(session: AdminSession) {
  return {
    answer: buildPersonaMenuText(currentConfig),
    sessionData: { ...session, currentMenu: MenuLevel.PERSONA }
  };
}

export async function handlePersonaMenu(message: string, session: AdminSession) {
  if (session.awaitingPersonaInput) {
    return handlePersonaUpdate(message, session);
  }

  switch (message) {
    case "1": return promptForUpdate('name', "Digite o novo nome para a persona:", session);
    case "2": return promptForUpdate('temperature', "Digite o novo valor de temperature (0-1, ex: 0.5):", session);
    case "3": return promptForUpdate('maxTokens', "Digite o novo máximo de tokens (ex: 500):", session);
    case "4": return promptForStyleUpdate(session);
    case "5": return promptForToneUpdate(session);
    case "6": return toggleEmojis(session);
    case "7": return resetPersonaToDefault(session);
    case "9": return { redirectTo: MenuLevel.MAIN };
    default: return buildInvalidOptionResponse(session);
  }
}

function buildPersonaMenuText(config: PersonaConfig): string {
  return `🎭 *Configurações de Persona*\n\n` +
    `1. ✏️ Nome: ${config.name}\n` +
    `2. 🌡️ Temperature: ${config.temperature} (0-1)\n` +
    `3. 🔠 Max Tokens: ${config.maxTokens}\n` +
    `4. 🎨 Estilo: ${config.responseStyle}\n` +
    `5. 🗣️ Tom Padrão: ${config.defaultTone}\n` +
    `6. ${config.useEmojis ? '✅' : '❌'} Usar Emojis\n` +
    `7. 🔄 Resetar Padrões\n` +
    `9. ↩️ Voltar`;
}

async function handlePersonaUpdate(input: string, session: AdminSession) {
  try {
    const field = session.awaitingPersonaInput!;
    const updates: PartialPersonaConfig = {};

    switch (field) {
      case 'name':
        if (input.length < 2 || input.length > 20) {
          throw new Error("Nome deve ter entre 2-20 caracteres");
        }
        updates.name = input;
        break;

      case 'temperature':
        const temp = parseFloat(input);
        if (isNaN(temp) || temp < 0 || temp > 1) {
          throw new Error("Temperature deve ser entre 0 e 1");
        }
        updates.temperature = temp;
        break;

      case 'maxTokens':
        const tokens = parseInt(input);
        if (isNaN(tokens) || tokens < 50 || tokens > 2000) {
          throw new Error("MaxTokens deve ser entre 50 e 2000");
        }
        updates.maxTokens = tokens;
        break;

      case 'responseStyle':
        updates.responseStyle = 
          input === '1' ? 'natural' :
          input === '2' ? 'technical' : 'creative';
        break;

      case 'defaultTone':
        updates.defaultTone = 
          input === '1' ? 'formal' :
          input === '2' ? 'informal' :
          input === '3' ? 'friendly' : 'technical';
        break;

      default:
        throw new Error("Campo inválido");
    }

    await applyPersonaUpdates(updates, session);
    
    return {
      answer: `✅ ${field} atualizado para: ${input}`,
      sessionData: { ...session, awaitingPersonaInput: undefined }
    };

  } catch (error) {
    return {
      answer: `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nTente novamente.`,
      sessionData: { ...session } 
    };
  }
}

async function applyPersonaUpdates(updates: PartialPersonaConfig, session: AdminSession) {
  currentConfig = { ...currentConfig, ...updates };
  await logAdminActivity(session, 'update_persona', updates);
}

async function promptForUpdate(field: keyof PersonaConfig, message: string, session: AdminSession) {
  return {
    answer: message,
    sessionData: { ...session, awaitingPersonaInput: field }
  };
}

async function promptForStyleUpdate(session: AdminSession) {
  return {
    answer: "Escolha o estilo de resposta:\n1. Natural\n2. Técnico\n3. Criativo",
    sessionData: { ...session, awaitingPersonaInput: 'responseStyle' }
  };
}

async function promptForToneUpdate(session: AdminSession) {
  return {
    answer: "Escolha o tom padrão:\n1. Formal\n2. Informal\n3. Amigável\n4. Técnico",
    sessionData: { ...session, awaitingPersonaInput: 'defaultTone' }
  };
}

async function toggleEmojis(session: AdminSession) {
  const newValue = !currentConfig.useEmojis;
  await applyPersonaUpdates({ useEmojis: newValue }, session);
  return getPersonaMenu(session);
}

async function resetPersonaToDefault(session: AdminSession) {
  await applyPersonaUpdates({ ...defaultPersonaConfig }, session);
  await logAdminActivity(session, 'reset_persona');
  return getPersonaMenu(session);
}

function buildInvalidOptionResponse(session: AdminSession) {
  return {
    answer: "⚠️ Opção inválida. Por favor, escolha uma opção do menu.",
    sessionData: session
  };
}

export function getCurrentPersonaConfig(): Readonly<PersonaConfig> {
  return currentConfig;
}