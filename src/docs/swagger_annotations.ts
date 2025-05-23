/**
 * @swagger
 * tags:
 *   - name: Typebot
 *     description: Endpoints de integração e autenticação para o Typebot (webhook, geração de HMAC)
 *   - name: FAQ
 *     description: Gerenciamento completo da base de perguntas frequentes (FAQs)
 *   - name: Admin
 *     description: Endpoints administrativos para monitoramento e gestão do sistema
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FAQ:
 *       type: object
 *       required:
 *         - pergunta
 *         - resposta
 *       properties:
 *         pergunta:
 *           type: string
 *           description: Pergunta da FAQ
 *           example: "Como acessar o Dashboard e quais perfis têm permissão para visualizá-lo?"
 *         resposta:
 *           type: string
 *           description: Resposta da FAQ
 *           example: "Para acessar o Dashboard, vá ao menu do sistema e clique em 'Dashboard'."
 *     FAQFull:
 *       allOf:
 *         - $ref: '#/components/schemas/FAQ'
 *         - type: object
 *           properties:
 *             _id:
 *               type: string
 *               description: ID único da FAQ
 *             normalizedPergunta:
 *               type: string
 *             tags:
 *               type: array
 *               items:
 *                 type: string
 *             categoria:
 *               type: string
 *             variacoes:
 *               type: array
 *               items:
 *                 type: string
 *             relevancia:
 *               type: integer
 *             acessos:
 *               type: integer
 *             relacionadas:
 *               type: array
 *               items:
 *                 type: string
 *             criadoEm:
 *               type: string
 *               format: date-time
 *             atualizadoEm:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * /api/typebot/generate-hmac:
 *   post:
 *     summary: Gera um token HMAC para autenticação do webhook
 *     description: |
 *       Este endpoint gera um token HMAC que deve ser utilizado para autenticar chamadas ao webhook do Typebot.
 *       O header `x-secret-key` deve conter a chave secreta compartilhada entre o seu sistema e a API.
 *       **Atenção:** O valor do HMAC depende exatamente do conteúdo de `phone` e `text` enviados.
 *       Exemplo de uso:
 *         1. Envie um POST para `/api/typebot/generate-hmac` com o mesmo `phone` e `text` que serão enviados ao webhook.
 *         2. Use o valor retornado em `hmac` no header `x-hmac-signature` ao chamar o webhook.
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
 *                 example: "Quero falar com um atendente"
 *     parameters:
 *       - in: header
 *         name: x-secret-key
 *         required: true
 *         schema:
 *           type: string
 *         description: |
 *           Chave secreta compartilhada para geração do HMAC.
 *           Este valor deve ser conhecido apenas pelo seu sistema e pela API para garantir a segurança da autenticação.
 *     responses:
 *       200:
 *         description: Token HMAC gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hmac:
 *                   type: string
 *                   description: Token HMAC gerado
 *                 expires_in:
 *                   type: integer
 *                   description: Tempo de expiração em segundos
 *                 algorithm:
 *                   type: string
 *                   description: Algoritmo utilizado
 *       400:
 *         description: Dados ausentes ou inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Erro interno ao gerar HMAC
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/typebot/webhook:
 *   post:
 *     summary: Webhook para receber mensagens do Typebot e responder com IA
 *     description: |
 *       Antes de chamar este endpoint, gere o token HMAC usando o endpoint `/api/typebot/generate-hmac`,
 *       passando exatamente o mesmo conteúdo de `phone` e `text` que será enviado para este webhook.
 *       O valor retornado em `hmac` deve ser enviado no header `x-hmac-signature`.
 *
 *       Exemplo de fluxo:
 *         1. POST /api/typebot/generate-hmac com `{ "phone": "...", "text": "..." }`
 *         2. Receba `{ "hmac": "..." }`
 *         3. POST /api/typebot/webhook com o mesmo body e header `x-hmac-signature: ...`
 *
 *       Exemplo de Pre-request Script para Postman:
 *       ```javascript
 *       // Supondo que o body da requisição já tem phone/text
 *       const phone = pm.request.body.raw ? JSON.parse(pm.request.body.raw).phone : "";
 *       const text = pm.request.body.raw ? JSON.parse(pm.request.body.raw).text : "";
 *       pm.sendRequest({
 *         url: pm.environment.get("baseUrl") + "/api/typebot/generate-hmac",
 *         method: "POST",
 *         header: { "x-secret-key": pm.environment.get("hmacSecret") },
 *         body: { mode: "raw", raw: JSON.stringify({ phone, text }) }
 *       }, function (err, res) {
 *         pm.request.headers.upsert({ key: "x-hmac-signature", value: res.json().hmac });
 *       });
 *       ```
 *       > Adapte para sua ferramenta de testes conforme necessário.
 *     tags: [Typebot]
 *     security:
 *       - HMAC: []
 *     parameters:
 *       - in: header
 *         name: x-hmac-signature
 *         required: true
 *         schema:
 *           type: string
 *         description: Token HMAC gerado previamente via /generate-hmac (deve ser gerado usando exatamente o mesmo phone e text)
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
 *               sessionId:
 *                 type: string
 *                 description: ID da sessão do chat (opcional)
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
 *                 sessionId:
 *                   type: string
 *                   description: ID da sessão do chat
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     faqs_utilizados:
 *                       type: array
 *                       items:
 *                         type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     transferToHuman:
 *                       type: boolean
 *                       description: Indica se o usuário pediu atendimento humano
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
 * /api/faqs:
 *   get:
 *     summary: Lista todas as FAQs cadastradas
 *     description: Retorna todas as FAQs presentes no banco de dados.
 *     tags: [FAQ]
 *     responses:
 *       200:
 *         description: Lista de FAQs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FAQFull'
 *   post:
 *     summary: Adiciona uma nova FAQ (também salva no faqs.json)
 *     description: |
 *       Adiciona uma nova FAQ seguindo a estrutura do faqs.json:
 *       {
 *         "pergunta": "Texto da pergunta",
 *         "resposta": "Texto da resposta"
 *       }
 *       O sistema irá processar a pergunta para gerar campos auxiliares (tags, variações, etc).
 *     tags: [FAQ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FAQ'
 *     responses:
 *       201:
 *         description: FAQ criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FAQFull'
 *   delete:
 *     summary: Remove todas as FAQs (limpa banco e faqs.json)
 *     description: Remove todas as FAQs do banco de dados e do arquivo faqs.json.
 *     tags: [FAQ]
 *     responses:
 *       200:
 *         description: FAQs removidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *
 * /api/faqs/search:
 *   get:
 *     summary: Pesquisa FAQs pelo assunto (campo pergunta)
 *     description: Pesquisa FAQs pelo texto informado no campo pergunta.
 *     tags: [FAQ]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Texto para pesquisar no campo pergunta
 *     responses:
 *       200:
 *         description: FAQs encontradas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FAQFull'
 *
 * /api/faqs/{id}:
 *   delete:
 *     summary: Remove uma FAQ pelo ID (remove do banco e do faqs.json)
 *     description: Remove a FAQ do banco de dados e do arquivo faqs.json.
 *     tags: [FAQ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da FAQ
 *     responses:
 *       200:
 *         description: FAQ removida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *
 * /api/faqs/sync-to-json:
 *   post:
 *     summary: Sincroniza FAQs do banco para o faqs.json
 *     description: Exporta todas as FAQs do banco para o arquivo faqs.json, mantendo apenas os campos pergunta e resposta.
 *     tags: [FAQ]
 *     responses:
 *       200:
 *         description: FAQs exportadas para o arquivo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *
 * /api/faqs/sync-to-db:
 *   post:
 *     summary: Sincroniza FAQs do faqs.json para o banco
 *     description: Importa todas as FAQs do arquivo faqs.json para o banco, processando cada pergunta conforme o seed.
 *     tags: [FAQ]
 *     responses:
 *       200:
 *         description: FAQs importadas para o banco
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total:
 *                   type: integer
 */

/**
 * @swagger
 * /api/admin/metrics:
 *   get:
 *     summary: Consulta métricas do sistema (provisório)
 *     description: |
 *       Retorna métricas gerais do sistema para uso administrativo. Endpoint provisório para testes via Swagger.
 *       Não requer autenticação.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Métricas do sistema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeChats:
 *                   type: integer
 *                 totalFaqs:
 *                   type: integer
 *                 totalActivities:
 *                   type: integer
 *                 uptime:
 *                   type: string
 *                 memoryUsage:
 *                   type: number
 *       500:
 *         description: Erro ao obter métricas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
