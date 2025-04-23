import { Schema, model, Document, Types } from "mongoose";

export interface IFAQ extends Document {
  pergunta: string;
  resposta: string;
  tags: string[];
  categoria: string;
  variacoes: string[]; // Formas alternativas de fazer a mesma pergunta
  relevancia: number; // Prioridade (1-5)
  acessos: number; // Contagem de uso
  relacionadas: Types.ObjectId[]; // FAQs conectadas
  criadoEm: Date;
  atualizadoEm: Date;
}

const FAQSchema = new Schema<IFAQ>(
  {
    pergunta: {
      type: String,
      required: true,
      unique: true,
      index: "text",
    },
    resposta: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      required: true,
      index: true,
    },
    categoria: {
      type: String,
      required: true,
      enum: [
        "Técnico",
        "Financeiro",
        "Plano",
        "Cadastro",
        "Segurança",
        "Pagamento",
        "Suporte",
        "Recursos",
        "Conta",
        "Privacidade",
        "Geral",
        "Outros",
      ],
      default: "Geral",
      index: true,
    },
    variacoes: [
      {
        type: String,
        validate: {
          validator: (v: string) => v.length >= 10,
          message: "Variação deve ter pelo menos 10 caracteres",
        },
      },
    ],
    relevancia: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    acessos: {
      type: Number,
      default: 0,
    },
    relacionadas: [
      {
        type: Schema.Types.ObjectId,
        ref: "FAQ",
      },
    ],
    criadoEm: {
      type: Date,
      default: Date.now,
    },
    atualizadoEm: Date,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes para otimização
FAQSchema.index({ categoria: 1, relevancia: -1 }); // Para ordenação prioritária
FAQSchema.index({ acessos: -1 }); // FAQs mais acessadas

// Atualiza automaticamente a data de modificação
FAQSchema.pre("save", function (next) {
  this.atualizadoEm = new Date();
  next();
});

// Método para registrar um acesso
FAQSchema.methods.registrarAcesso = async function () {
  this.acessos += 1;
  await this.save();
};


export const FAQModel = model<IFAQ>("FAQ", FAQSchema);
