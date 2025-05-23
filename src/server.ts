import express from "express";
import cors from "cors";
import { connectDB } from "./config/database";
import typebotRoutes from "./presentation/routes/typebotRoutes";
import dotenv from "dotenv";
import { setupSwagger } from "./docs/swagger";
import { ChatWorker } from "./workers/chat_worker";

dotenv.config();

class Server {
  private app: express.Application;
  private readonly PORT: number;
  private chatWorker: ChatWorker | null = null;

  constructor() {
    this.app = express();
    this.PORT = Number(process.env.PORT) || 4000;
    this.configureMiddleware();
    this.configureRoutes();
  }

  private configureMiddleware(): void {
    this.app.use(cors());

    this.app.use(
      express.json({
        strict: true,
        verify: (req: any, res, buf) => {
          try {
            JSON.parse(buf.toString());
          } catch (e) {
            throw new Error("JSON inválido");
          }
        },
      })
    );
  }

  private configureRoutes(): void {
    this.app.get("/", (req, res) => {
      res.json({
        status: "SigmaBot API online!",
        worker: this.chatWorker ? "active" : "inactive",
      });
    });

    this.app.use("/api", typebotRoutes);
  }

  private async initializeServices(): Promise<void> {
    try {
      await connectDB();
      console.log("📦 Conectado ao banco de dados");

      if (process.env.ENABLE_CHAT_WORKER === "true") {
        this.chatWorker = new ChatWorker();
        console.log("👷 Worker de chats iniciado");
      } else {
        console.log(
          "⏸️ Worker de chats desabilitado (ENABLE_CHAT_WORKER=false)"
        );
      }

      setupSwagger(this.app as express.Express);
    } catch (error) {
      console.error("❌ Falha na inicialização:", error);
      process.exit(1);
    }
  }

  public start(): void {
    this.initializeServices().then(() => {
      this.app.listen(this.PORT, () => {
        console.log(`\n🚀 Servidor rodando em http://localhost:${this.PORT}`);
        console.log(
          `📚 Documentação disponível em http://localhost:${this.PORT}/api-docs`
        );
      });
    });
  }
}

new Server().start();
