import { Schema, model, Document, Types } from "mongoose";
import crypto from "crypto";

interface IMessage {
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
  context: Types.ObjectId[];
  status: "delivered" | "failed" | "pending";
  responseTime?: number; // Tempo de resposta (em milissegundos)
}

interface IChat extends Document {
  sessionId: string;
  userPhone: string;
  userName?: string;
  status: "active" | "resolved" | "pending";
  messages: IMessage[];
  metadata?: {
    firstResponseTime?: number;
    averageResponseTime?: number;
    feedback?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  calculateAverageResponseTime(): number; // Método para cálculo do tempo médio
}

const ChatSchema = new Schema<IChat>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => crypto.randomUUID(),
    },
    userPhone: {
      type: String,
      required: true,
      index: true,
      match: /^\+\d{11,14}$/,
      validate: {
        validator: (v: string) => v.length >= 11 && v.length <= 15,
        message: "Telefone deve ter entre 11 e 15 dígitos",
      },
    },
    status: {
      type: String,
      enum: ["active", "resolved", "pending"],
      default: "active",
      index: true,
    },
    messages: [
      {
        content: {
          type: String,
          required: true,
          trim: true,
          minlength: 1,
          maxlength: 2000,
        },
        sender: {
          type: String,
          enum: ["user", "assistant"],
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
          index: true,
        },
        context: [
          {
            type: Schema.Types.ObjectId,
            ref: "FAQ",
            validate: {
              validator: function (this: IMessage, value: Types.ObjectId[]) {
                if (this.sender === "assistant") {
                  return value.length > 0 && value.length <= 5;
                }
                return true;
              },
              message: "Respostas devem conter 1-5 FAQs relacionados",
            },
            default: [], // Valor padrão explícito
          },
        ],
        status: {
          type: String,
          enum: ["delivered", "failed", "pending"],
          default: "pending",
        },
        responseTime: {
          type: Number,
          min: 0,
        },
      },
    ],
    metadata: {
      firstResponseTime: {
        type: Number,
        min: 0,
      },
      averageResponseTime: {
        type: Number,
        min: 0,
      },
      feedback: {
        type: Number,
        min: 1,
        max: 5,
        set: (v: number) => Math.round(v),
      },
      totalMessages: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    autoIndex: process.env.NODE_ENV === "development",
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual para contagem de mensagens
ChatSchema.virtual("messageCount").get(function () {
  return this.messages.length;
});

// Middleware para atualizar metadados
ChatSchema.pre("save", function (next) {
  if (this.isModified("messages")) {
    this.set("metadata.messageCount", this.messages.length);
  }
  if (this.isModified("messages") && this.messages.length > 0) {
    this.status = "active";
    this.updatedAt = new Date();
  }
  next();
});

// Método para cálculo do tempo médio
ChatSchema.methods.calculateAverageResponseTime = function () {
  const assistantMessages = this.messages.filter(
    (m: { sender: string }) => m.sender === "assistant"
  );
  if (assistantMessages.length === 0) return 0;

  return (
    assistantMessages.reduce(
      (acc: any, m: { responseTime: any }) => acc + m.responseTime,
      0
    ) / assistantMessages.length
  );
};

// Índice otimizado para buscas por sessão
ChatSchema.index({
  sessionId: 1,
  status: 1,
});

// Índice TTL para sessões inativas
ChatSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 2592000, // 30 dias
    partialFilterExpression: { status: "resolved" },
  }
);

export const ChatModel = model<IChat>("Chat", ChatSchema);
