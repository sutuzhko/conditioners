import { settingSchemas } from '@/entities/settings/model';
import { getGroup } from '@/server/repo/settings';
import { env } from '@/shared/config/env';

/**
 * Куда отправлять уведомления — выбор владельца из админки плюс адресация.
 *
 * 🔴 Разделение ответственности здесь принципиальное: владелец решает, в какие
 * каналы уходит заявка и по каким адресам, а доступы к этим каналам (токен
 * бота, пароль SMTP) остаются в переменных окружения и правятся тем, кто
 * держит сервер (инвариант 3).
 *
 * Пустой адрес в настройках означает «взять из окружения»: так работает
 * прежняя конфигурация, пока владелец не заполнил раздел.
 */
export type NotificationPrefs = {
  readonly telegram: { readonly enabled: boolean; readonly chatId: string | undefined };
  readonly email: { readonly enabled: boolean; readonly to: string | undefined };
};

/** Пустая строка — это «не задано», а не адрес: подставляем запасной вариант. */
function orFallback(value: string, fallback: string | undefined): string | undefined {
  const trimmed = value.trim();
  if (trimmed !== '') return trimmed;
  return fallback === undefined || fallback === '' ? undefined : fallback;
}

/**
 * Настройки доставки из базы. Группа не сохранена или испорчена — берутся
 * значения по умолчанию: оба канала включены, адреса из окружения. Молчать
 * при сбое чтения нельзя, но и ронять приём заявки — тем более.
 */
export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  let raw: unknown = null;

  try {
    raw = await getGroup('notifications');
  } catch (error) {
    console.error('Не удалось прочитать настройки уведомлений, берём умолчания', error);
  }

  const parsed = settingSchemas.notifications.safeParse(raw ?? {});
  const value = parsed.success ? parsed.data : settingSchemas.notifications.parse({});

  return {
    telegram: {
      enabled: value.telegram,
      chatId: orFallback(value.telegramChatId, env.TELEGRAM_CHAT_ID),
    },
    email: { enabled: value.email, to: orFallback(value.emailTo, env.NOTIFY_EMAIL_TO) },
  };
}
