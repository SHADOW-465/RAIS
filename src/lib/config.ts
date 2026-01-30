import { z } from 'zod';

// Helper for number env vars with defaults
const numberWithDefault = (defaultValue: number) =>
  z.preprocess(
    (val) => (val === undefined ? defaultValue : parseInt(String(val), 10)),
    z.number().default(defaultValue)
  );

const configSchema = z.object({
  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: numberWithDefault(5432),
  DB_NAME: z.string().default('rais_db'),
  DB_USER: z.string().default('rais_user'),
  DB_PASSWORD: z.string(),
  
  // AI
  GEMINI_API_KEY: z.string(),
  
  // Auth
  SESSION_SECRET: z.string().min(32),
  
  // Storage
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: numberWithDefault(52428800),
  
  // App
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsed.data;
