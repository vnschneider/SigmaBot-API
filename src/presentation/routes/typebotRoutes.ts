import { Request, Router } from "express";
import { ChatModel } from "../../infrastructure/db/models/chat";
import { DeepSeekService } from "../../infrastructure/services/deep_seek_service";
import { verifyHMAC } from "../../utils/hmacAuth";

const router = Router();

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
