import { existsSync } from 'node:fs';
import { createTransport } from 'nodemailer';
import { env } from '@/shared/config/env';
import { resolveUploadPath } from '@/server/uploads/store';
import { adminLink, attachedPhoto, notificationSubject, notificationText } from '../format';
import type { NotificationChannel, NotificationPayload } from '../types';

/**
 * Email — основной надёжный канал (ADR-007): российский SMTP работает всегда и
 * ничем не блокируется, в отличие от Telegram.
 *
 * Транспорт вынесен в зависимость: в тестах подставляется заглушка, а при
 * `NOTIFY_DRIVER=log` письмо пишется в лог и никуда не уходит — это режим
 * разработки по умолчанию, чтобы дев-окружение не слало почту живым людям.
 */
export type MailAttachment = {
  readonly filename: string;
  readonly path: string;
};

export type MailMessage = {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly attachments: readonly MailAttachment[];
};

export type MailTransport = {
  sendMail(message: MailMessage): Promise<void>;
};

const NOT_SET = '(не задан)';

/** В деве адреса пустые: в логе это должно читаться, а не выглядеть потерянной строкой. */
function orNotSet(value: string | undefined): string {
  return value === undefined || value === '' ? NOT_SET : value;
}

export const logMailTransport: MailTransport = {
  async sendMail(message: MailMessage): Promise<void> {
    const attachments =
      message.attachments.length === 0
        ? ''
        : `\nВложения: ${message.attachments.map((a) => a.filename).join(', ')}`;
    // console.warn, а не log: линтер оставляет только warn и error, а Docker
    // собирает оба потока — письмо в деве должно быть видно в `docker compose logs`
    console.warn(
      `[письмо] ${message.from} → ${message.to}\nТема: ${message.subject}\n${message.text}${attachments}`,
    );
  },
};

function smtpTransport(): MailTransport {
  const host = env.SMTP_HOST;
  if (host === undefined || host === '') {
    // ошибка попадёт в `Notification.lastError` и будет видна владельцу в админке
    throw new Error('Почтовый канал не настроен: не задан SMTP_HOST');
  }

  const port = env.SMTP_PORT ?? 587;
  // 465 — SMTPS, на остальных портах шифрование поднимается через STARTTLS
  const secure = port === 465;
  const auth =
    env.SMTP_USER === undefined || env.SMTP_PASSWORD === undefined
      ? null
      : { user: env.SMTP_USER, pass: env.SMTP_PASSWORD };

  /* Дефолтные таймауты nodemailer исчисляются минутами, а воркер один:
     зависший SMTP стопорил бы всю очередь и рвал graceful shutdown при
     деплое (40 с). Сумма ожиданий держится под окном захвата задачи —
     30 с до следующей попытки (runner.nextDelayMs). */
  const timeouts = {
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 15_000,
  };

  const transport =
    auth === null
      ? createTransport({ host, port, secure, ...timeouts })
      : createTransport({ host, port, secure, auth, ...timeouts });

  return {
    async sendMail(message: MailMessage): Promise<void> {
      await transport.sendMail({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        attachments: message.attachments.map((a) => ({ filename: a.filename, path: a.path })),
      });
    },
  };
}

/**
 * Технически ли канал готов работать: есть сервер, отправитель и получатель.
 * Выбор владельца в админке проверяется отдельно — это разные вещи.
 */
export function isEmailConfigured(to: string | undefined): boolean {
  if (env.NOTIFY_DRIVER === 'log') return true;
  return (
    env.SMTP_HOST !== undefined &&
    env.SMTP_HOST !== '' &&
    env.SMTP_FROM !== undefined &&
    env.SMTP_FROM !== '' &&
    to !== undefined &&
    to !== ''
  );
}

function attachments(payload: NotificationPayload): readonly MailAttachment[] {
  const photo = attachedPhoto(payload);
  if (photo === null) return [];
  const path = resolveUploadPath(photo);
  // файл могли удалить или volume не смонтирован — письмо важнее вложения
  if (path === null || !existsSync(path)) return [];
  return [{ filename: photo.slice(photo.lastIndexOf('/') + 1), path }];
}

export type EmailChannelPrefs = {
  /** Выбор владельца в админке. */
  readonly enabled: boolean;
  /** Получатель из настроек; пусто — берётся из окружения на уровне `prefs`. */
  readonly to: string | undefined;
};

export function createEmailChannel(
  transport?: MailTransport,
  prefs: EmailChannelPrefs = { enabled: true, to: env.NOTIFY_EMAIL_TO },
): NotificationChannel {
  return {
    name: 'email',
    // канал работает, только если владелец его выбрал и доступы на месте
    isEnabled: () => prefs.enabled && isEmailConfigured(prefs.to),
    async send(payload: NotificationPayload): Promise<void> {
      const chosen =
        transport ?? (env.NOTIFY_DRIVER === 'log' ? logMailTransport : smtpTransport());

      await chosen.sendMail({
        from: orNotSet(env.SMTP_FROM),
        to: orNotSet(prefs.to),
        subject: notificationSubject(payload),
        text: `${notificationText(payload)}\n\nОткрыть в админке: ${adminLink(payload)}`,
        attachments: attachments(payload),
      });
    },
  };
}
