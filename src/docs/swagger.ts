import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";

const SwaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SigmaBot API",
      version: "1.0.0",
      description: "Documentação da API SigmaBot",
    },
    servers: [
      {
        url: "https://sigmabot-api-production.up.railway.app",
        description: "Servidor de Produção",
      },
      {
        url: "http://localhost:4000",
        description: "Servidor de Desenvolvimento",
      },
    ],
    components: {
      securitySchemes: {
        HMAC: {
          type: "apiKey",
          name: "x-typebot-signature",
          in: "header",
          description: "Assinatura HMAC para autenticação",
        },
      },
    },
    security: [
      {
        HMAC: [],
      },
    ],
  },
  apis: ["./src/docs/swagger_annotations.ts"],
};
const swaggerSpec = swaggerJsDoc(SwaggerOptions);

export const setupSwagger = (app: Express): void => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log(
    "📄 Documentação do Swagger disponível em http://localhost:4000/api-docs"
  );
};
