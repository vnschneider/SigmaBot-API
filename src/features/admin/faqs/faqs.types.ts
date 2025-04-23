// src/features/admin/faqs/faqs.types.ts
import { IFAQ } from "../../../infrastructure/db/models/faq"; 
import {  Types } from "mongoose";
import { AdminSession } from "../admin.types";

export type FAQCreateInput = {
  pergunta: string;
  resposta: string;
  tags: string[];
  categoria?: string;
  variacoes?: string[];
  relevancia?: number;
};

export type FAQUpdateInput = Partial<FAQCreateInput>;

export type FAQSearchResult = Pick<IFAQ, 
  '_id' | 'pergunta' | 'resposta' | 'categoria' | 'relevancia'
> & { score?: number };

export type FAQOperationResponse = {
  success: boolean;
  message: string;
  faq?: IFAQ;
  error?: string;
};

export interface FAQSessionContext extends AdminSession {
  faqAction?: 'add' | 'edit' | 'delete' | 'search' | 'relate';
  currentFAQ?: Types.ObjectId;
  searchResults?: FAQSearchResult[];
  lastCommand?: string;
}