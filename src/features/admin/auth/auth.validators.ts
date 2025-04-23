// src/features/admin/auth/auth.validators.ts
export function validateAuthCommand(message: string): {
  accessKey: string;
  isMaster: boolean;
} {
  const prefix = "SigmaBot config:";

  if (!message.startsWith(prefix)) {
    throw new Error("Formato inválido. Use: SigmaBot config:sua_chave");
  }

  const accessKey = message.slice(prefix.length).trim();

  if (!accessKey) {
    throw new Error("Chave de acesso não pode estar vazia");
  }

  return {
    accessKey,
    isMaster: accessKey === process.env.MASTER_KEY,
  };
}
