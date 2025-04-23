import { AdminModel } from "../../../infrastructure/db/models/admin/admin";
import { AdminSession, MenuLevel } from "../admin.types";
import { generateAccessKey } from "./auth.utils";
import { validateAuthCommand } from "./auth.validators";
import dotenv from "dotenv";
import { Types } from "mongoose";

dotenv.config();

const MASTER_KEY = process.env.MASTER_KEY || "sigma_master_key_123";

export async function handleAuthInitial(
  userPhone: string,
  message: string,
  sessionId: string
): Promise<{
  authenticated: boolean;
  accessLevel?: "master" | "standard";
  message: string;
}> {
  try {
    const { accessKey, isMaster } = validateAuthCommand(message);

    if (isMaster) {
      if (accessKey !== MASTER_KEY) {
        console.log(`[Auth] Master key mismatch`, {
          received: accessKey,
          expected: MASTER_KEY,
        });
        return {
          authenticated: false,
          message: "❌ Chave master inválida!",
        };
      }

      const masterAdmin = await AdminModel.findOneAndUpdate(
        { accessKey: MASTER_KEY },
        {
          $setOnInsert: {
            accessLevel: "master",
            createdAt: new Date(),
            createdBy: "system_init", // Permitir string ou ObjectId
          },
        },
        { upsert: true, new: true }
      );

      return {
        authenticated: true,
        accessLevel: "master",
        message: "🐱‍👤 *Modo Admin Master Ativado*",
      };
    }

    const admin = await AdminModel.findOne({ accessKey });
    if (!admin) {
      console.log(`[Auth] Standard key not found`, { accessKey });
      return {
        authenticated: false,
        message: "❌ Chave de acesso inválida!",
      };
    }

    return {
      authenticated: true,
      accessLevel: admin.accessLevel,
      message: `🐱‍👤 *Modo Admin ${
        admin.accessLevel === "master" ? "(Master)" : ""
      } Ativado*`,
    };
  } catch (error) {
    console.error("[Auth] Error in handleAuthInitial:", error);
    return {
      authenticated: false,
      message: "❌ Erro durante a autenticação",
    };
  }
}

export function getAuthMenu(session: AdminSession) {
  if (session.accessLevel !== "master") {
    return {
      answer: "❌ Apenas usuários master podem acessar este menu",
      sessionData: null,
    };
  }

  return {
    answer:
      "🔑 *Gerenciamento de Chaves*\n\n" +
      "1. Gerar nova chave\n" +
      "2. Revogar chave\n" +
      "3. Listar chaves ativas\n" +
      "9. Voltar",
    sessionData: null,
  };
}

export async function handleAuthMenu(message: string, session: AdminSession) {
  if (session.accessLevel !== "master") {
    return {
      answer: "❌ Apenas usuários master podem acessar este menu",
      sessionData: null,
    };
  }

  switch (message) {
    case "1":
      const newKey = generateAccessKey(session.userPhone);
      const newAdmin = new AdminModel({
        accessKey: newKey,
        accessLevel: "standard",
        createdAt: new Date(),
        createdBy: Types.ObjectId.isValid(session.userPhone)
          ? new Types.ObjectId(session.userPhone)
          : session.userPhone, // Permitir ObjectId ou string
      });

      await newAdmin.save();

      return {
        answer: `✅ Nova chave gerada:\n\n${newKey}\n\nNível: Standard`,
        sessionData: null,
      };

    case "2":
      return {
        answer: "Digite a chave que deseja revogar:",
        sessionData: {
          ...session,
          awaitingPersonaInput: "revoke_key",
        },
      };

    case "3":
      const keys = await AdminModel.find({}, "accessKey accessLevel createdAt");
      return {
        answer:
          "🔑 Chaves Ativas:\n\n" +
          keys
            .map(
              (k) =>
                `• ${k.accessKey} (${
                  k.accessLevel
                })\n   Criada em: ${k.createdAt.toLocaleString()}`
            )
            .join("\n"),
        sessionData: null,
      };

    case "9":
      return {
        answer: "",
        sessionData: {
          ...session,
          currentMenu: MenuLevel.MAIN,
        },
      };

    default:
      return {
        answer: "⚠️ Opção inválida",
        sessionData: null,
      };
  }
}

export async function handleRevokeKey(key: string, session: AdminSession) {
  if (session.accessLevel !== "master") {
    return {
      answer: "❌ Apenas usuários master podem revogar chaves",
      sessionData: null,
    };
  }

  // Não permitir revogar a própria chave master
  if (key === MASTER_KEY) {
    return {
      answer: "❌ Não é possível revogar a chave master",
      sessionData: null,
    };
  }

  const result = await AdminModel.deleteOne({ accessKey: key });

  if (result.deletedCount === 0) {
    return {
      answer: "❌ Chave não encontrada",
      sessionData: null,
    };
  }

  return {
    answer: `✅ Chave "${key}" revogada com sucesso!`,
    sessionData: null,
  };
}