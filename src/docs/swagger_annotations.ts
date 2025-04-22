/**
 * @swagger
 * /api/typebot/webhook:
 *   post:
 *     summary: Webhook para receber mensagens do Typebot e responder com IA
 *     tags: [Typebot]
 *     security:
 *       - HMAC: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Número de telefone do usuário
 *                 example: "+5511999999999"
 *               text:
 *                 type: string
 *                 description: Texto enviado pelo usuário
 *                 example: "Como alterar o idioma das mensagens do bot?"
 *     responses:
 *       200:
 *         description: Resposta gerada pelo bot
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resposta:
 *                   type: string
 *                   description: Resposta gerada pelo bot
 *                   example: "Para alterar o idioma das mensagens do bot, acesse as configurações."
 *       403:
 *         description: Assinatura HMAC inválida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro
 *                   example: "Assinatura HMAC inválida!"
 */

/**
 * @swagger
 * tags:
 *   name: Typebot
 *   description: Endpoints relacionados ao Typebot
 */

/**
 * @swagger
 * /api/typebot/webhook:
 *   post:
 *     summary: Webhook para receber mensagens do Typebot e responder com IA
 *     tags: [Typebot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Número de telefone do usuário
 *                 example: "+5511999999999"
 *               text:
 *                 type: string
 *                 description: Texto enviado pelo usuário
 *                 example: "Como alterar o idioma das mensagens do bot?"
 *     responses:
 *       200:
 *         description: Resposta gerada pelo bot
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resposta:
 *                   type: string
 *                   description: Resposta gerada pelo bot
 *                   example: "Para alterar o idioma das mensagens do bot, acesse as configurações."
 *       403:
 *         description: Assinatura HMAC inválida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro
 *                   example: "Assinatura HMAC inválida!"
 */
