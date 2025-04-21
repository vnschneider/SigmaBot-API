import axios from "axios";
import dotenv from "dotenv";
import { FAQModel } from "../db/models/faq";

dotenv.config();

export class DeepSeekService {
  static async getResponse(userQuestion: string): Promise<string> {
    console.log("Pergunta do usuário:", userQuestion);
    // 1. Busca FAQs relevantes no MongoDB
    const textSearchResults = (await FAQModel.find(
      { $text: { $search: userQuestion } } // Busca por similaridade textual
    )
      .sort({ score: { $meta: "textScore" } }) // Ordena pela relevância do texto
      .limit(5)) as Array<{
      pergunta: any;
      resposta: any;
      _id: any;
    }>; // Define explicit type for _id

    const additionalSearchResults = await FAQModel.find({
      $or: [
        { pergunta: { $regex: userQuestion, $options: "i" } }, // Busca por regex
        { tags: { $in: userQuestion.toLowerCase().split(" ") } }, // Busca por tags
      ],
    }).limit(5);

    // Combina os resultados, removendo duplicatas
    const relevantFAQs = [
      ...textSearchResults,
      ...additionalSearchResults.filter(
        (faq) => !textSearchResults.some((result) => result._id.equals(faq._id))
      ),
    ].slice(0, 5); // Limita a 5 resultados no total

    // 2. Monta o contexto para o DeepSeek
    const context = relevantFAQs
      .map((faq) => `P: ${faq.pergunta}\nR: ${faq.resposta}`)
      .join("\n\n");
    console.log("Contexto:", context);

    try {
      const response = await axios.post(
        "https://api.deepseek.com/v1/chat/completions",
        {
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `Você é um atendente da Sigma Network. Use este contexto:\n${context}\n\nSe não souber, diga: "Vou verificar e te retorno."`,
            },
            { role: "user", content: userQuestion },
          ],
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error("Erro na DeepSeek API:", error);
      return "Desculpe, estou com dificuldades. Tente novamente mais tarde.";
    }
  }
}
