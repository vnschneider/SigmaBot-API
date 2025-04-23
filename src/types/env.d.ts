declare namespace NodeJS {
  interface ProcessEnv {
    MONGODB_URI_PROD: string;
    TYPEBOT_SECRET_KEY: string;
    DEEPSEEK_API_KEY: string;
    MESSAGING_API_URL: string;
    ENABLE_CHAT_WORKER: string;
    PORT: string;
  }
}
