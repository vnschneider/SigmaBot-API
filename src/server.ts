import express from "express";
import cors from "cors";
import { connectDB } from "./config/database";
import typebotRoutes from "./presentation/routes/typebotRoutes";
import dotenv from "dotenv";
import { setupSwagger } from "./docs/swagger";

dotenv.config();

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

connectDB();
setupSwagger(app);

app.get("/", (req, res) => {
  res.json({ status: "SigmaBot API online!" });
});

app.use("/api", typebotRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
