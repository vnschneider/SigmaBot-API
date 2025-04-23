// src/features/admin/persona/persona.utils.ts
import { AdminActivityModel } from "../../../infrastructure/db/models/admin/adminActivity";

interface PersonaConfig {
  name: string;
  temperature: number;
  maxTokens: number;
  responseStyle: string;
  defaultTone: "formal" | "informal" | "friendly" | "technical";
  useEmojis: boolean;
}

export const personaConfig: PersonaConfig = {
  name: "Rafa",
  temperature: 0.7,
  maxTokens: 300,
  responseStyle: "natural",
  defaultTone: "friendly",
  useEmojis: true,
};

export async function updatePersonaConfig(
  updates: Partial<PersonaConfig>,
  session: any
) {
  Object.assign(personaConfig, updates);

  await AdminActivityModel.create({
    adminId: session.adminId,
    action: "update_persona",
    metadata: updates,
  });
}
