# SigmaBot API 🤖

Bem-vindo ao **SigmaBot API**, uma API desenvolvida para gerenciar FAQs e integrar com serviços de IA para fornecer respostas inteligentes e automatizadas. 🚀

## 📋 Funcionalidades

- **Gerenciamento de FAQs**: CRUD de perguntas e respostas frequentes.
- **Busca Inteligente**: Busca relevante no banco de dados utilizando índices de texto.
- **Integração com IA**: Integração com a API DeepSeek para respostas contextuais.
- **API RESTful**: Endpoints organizados e prontos para uso.
- **Documentação Swagger**: Documentação interativa para explorar os endpoints da API.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js** com **Express** para o backend.
- **MongoDB** com **Mongoose** para o banco de dados.
- **TypeScript** para tipagem estática.
- **Axios** para requisições HTTP.
- **Dotenv** para gerenciamento de variáveis de ambiente.
- **Jest** para testes unitários.
- **Swagger** para documentação da API.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

- **Node.js** (v16 ou superior)
- **MongoDB** (local ou via Docker)
- **Yarn** (Gerenciador de pacotes)

### Passos

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/vnschneider/SigmaBot-API.git
   cd SigmaBot-API
   ```

````
2. **Instale as dependências**:
   ```bash
   yarn install
````

3. **Configure as variáveis de ambiente**:
   Crie um arquivo `.env` na raiz do projeto e adicione as variáveis de ambiente necessárias (acesse a aba Issues para mais informações).

4. **Inicie o MongoDB** (se não estiver usando o banco de dados localmente):

   ```bash
   yarn docker:db
   ```

5. **Inicie o servidor**:

   ```bash
   yarn dev
   ```

   O servidor estará rodando em `http://localhost:4000`.

6. **Acesse a documentação da API**:
   Acesse `http://localhost:4000/api-docs` para visualizar a documentação Swagger da API.

#### 📦 Scripts Disponíveis

- `yarn dev`: Inicia o servidor em modo de desenvolvimento.
- `yarn build`: Compila o projeto para produção.
- `yarn start`: Inicia o servidor em modo de produção.
- `yarn test`: Executa os testes unitários.
- `yarn docker:db`: Inicia o MongoDB via Docker.
- `yarn faqs`: Popula o banco de dados com FAQs de exemplo.

#### 📚 Estrutura do Projeto

SigmaBot-API/
├── src/
│ ├── config/ # Configurações do banco de dados
│ ├── infrastructure/ # Serviços e modelos do banco
│ ├── presentation/ # Rotas da API
│ ├── docs/ # Configuração do Swagger
│ ├── scripts/ # Scripts utilitários
│ └── [server.ts](http://_vscodecontentref_/0) # Arquivo principal do servidor
├── [package.json](http://_vscodecontentref_/1) # Configuração do projeto
├── [README.md](http://_vscodecontentref_/2) # Documentação
└── .env # Variáveis de ambiente

#### 🧪 Testes

```bash
yarn test
```

#### 🐳 Docker

**Inicie o MongoDB**

```bash
yarn docker:db
```

**Inicie a API**

```bash
yarn docker:api
```

#### 📄 Licença

Este projeto está licenciado sob a MIT License. Veja o arquivo [LICENSE](http://_vscodecontentref_/3) para mais detalhes.

#### 👤 Autor

Vitor Schneider - [GitHub](https://github.com/vnschneider)
Gustavo PAssinho - [GitHub](https://github.com/gu5tvo)
