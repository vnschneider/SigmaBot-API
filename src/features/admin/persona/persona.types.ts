// src/features/admin/persona/persona.types.ts
export interface PersonaConfig {
  name: string;
  temperature: number;
  maxTokens: number;
  responseStyle: "natural" | "technical" | "creative";
  defaultTone: "formal" | "informal" | "friendly" | "technical";
  useEmojis: boolean;
}

export type PartialPersonaConfig = Partial<PersonaConfig>;

export const defaultPersonaConfig: PersonaConfig = {
  name: "Rafa",
  temperature: 0.7,
  maxTokens: 300,
  responseStyle: "natural",
  defaultTone: "friendly",
  useEmojis: true,
};
