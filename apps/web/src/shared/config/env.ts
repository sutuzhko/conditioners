import { z } from 'zod';

import { UPLOAD_MAX_BYTES } from './uploads';

/**
 * Конфигурация проверяется при старте: приложение не поднимается с неполными
 * переменными, вместо того чтобы падать на первой заявке (docs/CLAUDE.md).
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  SITE_URL: z.string().url(),

  SESSION_SECRET: z.string().min(16),

  UPLOADS_DIR: z.string().default('/data/uploads'),
  // предел один на проект: клиентская проверка берёт его из того же файла
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(UPLOAD_MAX_BYTES),

  NOTIFY_DRIVER: z.enum(['log', 'live']).default('log'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  NOTIFY_EMAIL_TO: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  TELEGRAM_TRANSPORT: z.enum(['direct', 'proxy', 'off']).default('off'),
  TELEGRAM_PROXY_URL: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Некорректная конфигурация окружения:\n${problems}`);
}

export const env = parsed.data;
