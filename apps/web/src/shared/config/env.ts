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

  /* Файл-метка, которую `infra/backup.sh` трогает после удачного дампа.
     Сам каталог дампов в контейнер `web` не монтируется: дыра в приложении не
     должна отдавать наружу всю историю персональных данных (ADR-191). */
  BACKUP_MARK_PATH: z.string().optional(),

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

/* 🔴 От схемы SITE_URL зависит флаг Secure у cookie сессии (server/auth.ts).
   В production http означал бы сессию, которую видно в открытом трафике, —
   поэтому конфигурация с ним не поднимается вовсе. */
/** Заполнено ли поле: пустая строка в ENV означает «не задано», а не «задано пустым». */
function filled(value: string | undefined): boolean {
  return value !== undefined && value !== '';
}

const config = schema.superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production' && !value.SITE_URL.startsWith('https://')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SITE_URL'],
      message: 'в production сайт обязан отдаваться по https',
    });
  }

  /* 🔴 Режим обязан приходить со своими полями, иначе приложение поднимается и
     молча ничего не отправляет. Заявка при этом доходит до базы (инвариант 2),
     но владелец о ней не узнаёт — а это и есть потерянная заявка, только
     обнаруженная через неделю. Чек-лист запуска предупреждает об этом отдельным
     пунктом; предупреждение в документе слабее отказа старта. */
  if (value.NOTIFY_DRIVER === 'live') {
    // те же условия, по которым каналы считают себя готовыми к работе
    const email = filled(value.SMTP_HOST) && filled(value.SMTP_FROM);
    const telegram = value.TELEGRAM_TRANSPORT !== 'off' && filled(value.TELEGRAM_BOT_TOKEN);

    if (!email && !telegram) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NOTIFY_DRIVER'],
        message:
          'live без единого настроенного канала: нужен SMTP_HOST и SMTP_FROM ' +
          'либо TELEGRAM_BOT_TOKEN с транспортом не off',
      });
    }
  }

  if (value.TELEGRAM_TRANSPORT === 'proxy' && !filled(value.TELEGRAM_PROXY_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['TELEGRAM_PROXY_URL'],
      message: 'транспорт proxy требует адреса прокси',
    });
  }
});

const parsed = config.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Некорректная конфигурация окружения:\n${problems}`);
}

export const env = parsed.data;
