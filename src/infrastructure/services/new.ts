// import { FAQModel } from "../db/models/FAQ";

// export class DeepSeekService {
//   static async getResponse(userQuestion: string): Promise<string> {
//     // 1. Busca FAQs relevantes no MongoDB
//     const relevantFAQs = await FAQModel.find({
//       $or: [
//         { pergunta: { $regex: userQuestion, $options: "i" } },
//         { tags: { $in: userQuestion.toLowerCase().split(" ") } },
//       ],
//     }).limit(5);

//     // 2. Monta o contexto para o DeepSeek
//     const context = relevantFAQs
//       .map((faq) => `P: ${faq.pergunta}\nR: ${faq.resposta}`)
//       .join("\n\n");

//     // 3. Chama a API do DeepSeek
//     const response = await axios.post(
//       "https://api.deepseek.com/v1/chat/completions",
//       {
//         model: "deepseek-chat",
//         messages: [
//           {
//             role: "system",
//             content: `Você é um atendente da Sigma Network. Use este contexto:\n${context}\n\nSe não souber, diga: "Vou verificar e te retorno."`,
//           },
//           { role: "user", content: userQuestion },
//         ],
//         temperature: 0.3,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     return response.data.choices[0].message.content;
//   }
// }
