import { Request, Router } from "express";
import { ChatModel } from "../../infrastructure/db/models/chat";
import { DeepSeekService } from "../../infrastructure/services/deep_seek_service";
import { verifyHMAC } from "../../utils/hmacAuth";
import crypto from "crypto";

const router = Router();

router.post("/typebot/generate-hmac", (req: Request, res) => {
  const secret = req.headers["x-secret-key"] as string;
  if (!secret) {
    return res
      .status(400)
      .json({ error: "O cabeçalho 'x-secret-key' é obrigatório." });
  }

  const { phone, text } = req.body;
  if (!phone || !text) {
    return res
      .status(400)
      .json({ error: "Os campos 'phone' e 'text' são obrigatórios." });
  }

  // Cria o corpo da requisição como string JSON
  const rawBody = JSON.stringify({ phone, text });

  // Gera o HMAC usando o algoritmo SHA256 e o segredo fornecido
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // Retorna o HMAC gerado
  res.json({ hmac });
});

router.post("/typebot/webhook", async (req: Request, res) => {
  if (!verifyHMAC(req)) {
    return res.status(403).json({ error: "Assinatura HMAC inválida!" });
  }
  const { phone, text } = req.body;
  const resposta = await DeepSeekService.getResponse(text);

  await ChatModel.findOneAndUpdate(
    { userPhone: phone },
    {
      $push: {
        messages: [
          { text, sender: "user" },
          { text: resposta, sender: "bot" },
        ],
      },
    },
    { upsert: true, new: true }
  );

  res.json({ resposta });
});

export default router;
