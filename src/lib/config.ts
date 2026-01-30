import { z } from 'zod';

// Helper for number env vars with defaults
const numberWithDefault = (defaultValue: number) =>
  z.preprocess(
    (val) => (val === undefined ? defaultValue : parseInt(String(val), 10)),
    z.number().default(defaultValue)
  );

const configSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().default('https://placeholder.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default('placeholder-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Legacy Database (kept for backward compatibility during migration)
  DB_HOST: z.string().default('localhost'),
  DB_PORT: numberWithDefault(5432),
  DB_NAME: z.string().default('rais_db'),
  DB_USER: z.string().default('rais_user'),
  DB_PASSWORD: z.string().optional(),

  // AI
  GEMINI_API_KEY: z.string().optional().default(''),

  // Auth
  SESSION_SECRET: z.string().optional().default('dev-placeholder-secret-32-chars!'),

  // Storage (Supabase Storage bucket name)
  SUPABASE_STORAGE_BUCKET: z.string().default('uploads'),
  MAX_FILE_SIZE: numberWithDefault(52428800),

  // Legacy Storage (kept for backward compatibility)
  UPLOAD_DIR: z.string().default('./uploads'),

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
