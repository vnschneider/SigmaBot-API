// src/features/admin/admin.types.ts
export enum MenuLevel {
  MAIN = "main",
  AUTH = "auth",
  FAQS = "faqs",
  METRICS = "metrics",
  PERSONA = "persona",
}

export interface AdminSession {
  awaitingPersonaInput: any;
  awaitSearchTerm: any;
  personaTempData?: any;
  sessionId: string;
  userPhone: string;
  accessLevel: "master" | "standard";
  currentMenu: MenuLevel;
  data?: any; // Para armazenar contexto temporário
  createdAt: Date;
  lastActivity: Date;
}

// src/features/admin/admin.types.ts
export type PersonaField = 
  'name' | 
  'temperature' | 
  'maxTokens' | 
  'responseStyle' | 
  'defaultTone' | 
  'useEmojis';


