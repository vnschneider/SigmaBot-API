import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

//TODO: Substituir para variável PROD depois
const MONGODB_URI =
  process.env.MONGODB_URI_PROD || "mongodb://localhost:27017/sigmabot-api";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado ao MongoDB (sigmabot-api)");
  } catch (error) {
    console.error("❌ Erro no MongoDB:", error);
    process.exit(1);
  }
};
