import { Schema, model, Document } from "mongoose";

interface IFAQ extends Document {
  pergunta: string;
  resposta: string;
  tags: string[];
}

const FAQSchema = new Schema<IFAQ>({
  pergunta: { type: String, required: true, unique: true },
  resposta: { type: String, required: true },
  tags: [{ type: String }],
});

FAQSchema.index({ pergunta: "text", tags: "text" });

export const FAQModel = model<IFAQ>("FAQ", FAQSchema);
