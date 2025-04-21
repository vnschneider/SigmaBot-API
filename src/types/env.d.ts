declare namespace NodeJS {
  interface ProcessEnv {
    MONGODB_URI: string;
    TYPEBOT_SECRET_KEY: string;
    DEEPSEEK_API_KEY: string;
    PORT: string;
  }
}
