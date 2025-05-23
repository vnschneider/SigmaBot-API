# SigmaBot API 🤖

Bem-vindo ao **SigmaBot API**, uma solução robusta para gerenciamento de FAQs, automação de atendimento, integração com IA e administração de operações via chat ou REST.  
Ideal para empresas que desejam centralizar conhecimento, automatizar respostas e monitorar métricas do atendimento.

---

## 📋 Funcionalidades

- **Gerenciamento de FAQs**: CRUD completo de perguntas frequentes, importação/exportação, sincronização com arquivo local e enriquecimento automático dos dados.
- **Busca Inteligente**: Busca textual avançada e contexto dinâmico para respostas mais relevantes.
- **Integração com IA**: Respostas contextuais via DeepSeek, com fallback inteligente e histórico de conversas.
- **Webhook seguro**: Receba e responda mensagens do Typebot com autenticação HMAC.
- **Administração via Chat**: Menu administrativo para métricas, FAQs, autenticação e configuração de persona, tudo pelo WhatsApp/chat.
- **Métricas do Sistema**: Endpoint REST para consulta de métricas em tempo real (chats ativos, FAQs, uso de memória, uptime, etc).
- **Documentação Swagger**: Interface interativa para explorar e testar todos os endpoints da API.
- **Scripts utilitários**: População de FAQs, seed, importação/exportação, etc.
- **Testes unitários**: Cobertura de lógica crítica com Jest.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js** + **Express** (backend)
- **MongoDB** + **Mongoose** (banco de dados)
- **TypeScript** (tipagem estática)
- **Axios** (requisições HTTP)
- **Dotenv** (variáveis de ambiente)
- **Jest** (testes)
- **Swagger** (documentação)
- **Docker** (ambiente de desenvolvimento e produção)

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

- **Node.js** (v16 ou superior)
- **Yarn** (Gerenciador de pacotes)
- **Docker** (para rodar MongoDB e/ou a API facilmente)
- **MongoDB** (caso prefira rodar localmente, mas Docker é recomendado)

> **Importante:**  
> É necessário criar e configurar o arquivo `.env` na raiz do projeto com todas as variáveis de ambiente necessárias para a API e o banco.  
> **A lista completa das variáveis de ambiente está disponível na aba Issues do repositório no GitHub, em "environment variables".**  
> Exemplos de variáveis: `MONGO_URI`, `DEEPSEEK_API_KEY`, `MASTER_KEY`, etc.

### Passos

1. **Clone o repositório**:

   ```bash
   git clone https://github.com/vnschneider/SigmaBot-API.git
   cd SigmaBot-API
   ```

2. **Instale as dependências**:

   ```bash
   yarn install
   ```

3. **Configure as variáveis de ambiente**:
   Crie um arquivo `.env` na raiz do projeto e adicione as variáveis necessárias (consulte a documentação interna ou a aba Issues para detalhes).

4. **Inicie o MongoDB via Docker** (recomendado):

   ```bash
   yarn docker:db
   ```

   > Ou configure o MongoDB localmente conforme sua preferência.

5. **Popule o banco de dados com FAQs de exemplo** (opcional, mas recomendado para testes):

   ```bash
   yarn faqs
   ```

6. **Inicie o servidor em modo desenvolvimento**:

   ```bash
   yarn dev
   ```

   O servidor estará disponível em `http://localhost:4000`.

7. **Acesse a documentação Swagger**:
   - Navegue até `http://localhost:4000/api-docs` para explorar e testar todos os endpoints da API.

---

### 📦 Scripts Disponíveis

- `yarn dev`: Inicia o servidor em modo de desenvolvimento (hot reload).
- `yarn build`: Compila o projeto para produção.
- `yarn start`: Inicia o servidor em modo de produção.
- `yarn test`: Executa os testes unitários.
- `yarn docker:db`: Sobe o MongoDB via Docker.
- `yarn docker:api`: Sobe a API em container Docker.
- `yarn faqs`: Popula o banco de dados com FAQs de exemplo (seed).

---

### 📚 Estrutura do Projeto

```
SigmaBot-API/
├── src/
│   ├── config/           # Configurações do banco de dados
│   ├── infrastructure/   # Serviços, modelos e integrações externas
│   ├── features/         # Domínios de negócio (admin, faqs, persona, etc)
│   ├── presentation/     # Rotas e controllers da API
│   ├── docs/             # Configuração e anotações Swagger
│   ├── scripts/          # Scripts utilitários (seed, import/export)
│   └── server.ts         # Arquivo principal do servidor
├── package.json
├── README.md
├── .env                  # Variáveis de ambiente
└── docker-compose.yml    # (opcional) Orquestração Docker
```

---

### 🧪 Testes

Execute todos os testes unitários:

```bash
yarn test
```

---

### 🐳 Docker

**Suba o MongoDB:**

```bash
yarn docker:db
```

**Suba a API em container:**

```bash
yarn docker:api
```

Ou use o `docker-compose` para subir tudo (MongoDB + API):

```bash
docker-compose up --build
```

> Você pode customizar as portas usando variáveis de ambiente `API_PORT` e `MONGO_PORT` ao rodar o `docker-compose`:
>
> - Linux/macOS: `API_PORT=5000 MONGO_PORT=28017 docker-compose up`
> - Windows (cmd): `set API_PORT=5000 && set MONGO_PORT=28017 && docker-compose up`
> - Windows (PowerShell): `$env:API_PORT=5000; $env:MONGO_PORT=28017; docker-compose up`

> **Atenção:**  
> O arquivo `.env` **deve** estar presente na raiz do projeto para que a API funcione corretamente em Docker.

## 🤝 Integração com Typebot  
### **Configuração Básica**  
**Variáveis Necessárias no Typebot**:  
- `{{api_url}}`: URL da API (ex: `http://189.90.44.226:4000/api/typebot`).  
- `{{user_phone}}`: Número do usuário (capturado automaticamente).  
- `{{session_id}}`: ID de sessão (gerado na primeira resposta da API).  

### **Passos Principais**  
1. **Primeira Interação do Usuário**:  
   - Gere um token HMAC (`POST /generate-hmac`).  
   - Chame o webhook (`POST /webhook`) para obter resposta + `session_id`.  

2. **Interações Seguintes**:  
   - Reutilize `{{session_id}}` em chamadas para `POST /webhook`.  
   - Mantenha o contexto da conversa via HMAC e sessão persistente.  

**Documentação Detalhada**:  
🔗 [Fluxo Completo no Notion](https://glossy-nutria-de0.notion.site/Documenta-o-do-Fluxo-SigmaBot-Typebot-1fc43104aa35806ca28ad52a47dfa80e?pvs=4) (inclui screenshots, exemplos de requisições e tratamento de erros).  

---

### 🔒 Segurança

- Use sempre variáveis de ambiente para chaves e tokens sensíveis.
- O webhook do Typebot exige autenticação HMAC.
- Endpoints administrativos podem ser protegidos por autenticação via chat ou por IP/firewall.

---

### 📄 Licença

Este projeto está licenciado sob a MIT License. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.

---

### 👤 Autores

- Vitor Schneider - [GitHub](https://github.com/vnschneider)
- Gustavo Passinho - [GitHub](https://github.com/gu5tvo)

---

## 💡 Sugestões de Melhoria

- Adicionar autenticação JWT para endpoints REST administrativos.
- Implementar cache para buscas frequentes de FAQs.
- Adicionar monitoramento de saúde (healthcheck) para API e banco.
- Melhorar cobertura de testes automatizados.
- Criar exemplos de integração com outros bots além do Typebot.
- Adicionar suporte a múltiplos idiomas nas respostas da IA.
- Automatizar deploy com CI/CD (GitHub Actions, etc).
