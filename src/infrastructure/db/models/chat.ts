import { Schema, model, Document } from 'mongoose';

interface IMessage {
  text: string;
  sender: 'user' | 'bot';
  timestamp?: Date;
}

interface IChat extends Document {
  userPhone: string;
  userName?: string;
  messages: IMessage[];
  createdAt?: Date;
  updatedAt?: Date;
}

const ChatSchema = new Schema<IChat>({
  userPhone: { type: String, required: true, unique: true },
  userName: { type: String },
  messages: [
    {
      text: { type: String, required: true },
      sender: { type: String, enum: ['user', 'bot'], required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

export const ChatModel = model<IChat>('Chat', ChatSchema);