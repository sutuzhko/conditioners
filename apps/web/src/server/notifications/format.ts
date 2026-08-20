import { env } from '@/shared/config/env';
import type { NotificationPayload } from './types';

/**
 * Тексты уведомлений владельцу. Формат заявки и отзыва повторяет тот, что
 * сложился в прототипе (docs/API.md §9): владелец читает эти сообщения
 * каждый день, и менять привычную раскладку строк без нужды не стоит.
 *
 * Ни одного факта о компании здесь нет — только то, что прислал человек.
 */
const DASH = '—';

/** Разделы админки, куда ведёт ссылка из письма. */
const ADMIN_LEADS_PATH = '/admin/leads';
const ADMIN_REVIEWS_PATH = '/admin/reviews';

function orDash(value: string | null): string {
  return value === null || value === '' ? DASH : value;
}

export function notificationText(payload: NotificationPayload): string {
  if (payload.kind === 'lead') {
    return [
      '🆕 Новая заявка с сайта',
      '',
      `🧭 Тема: ${payload.topic}`,
      `👤 Имя: ${payload.name}`,
      `📞 Телефон: ${payload.phone}`,
      `📍 Адрес/район: ${orDash(payload.address)}`,
      `🏠 Тип помещения: ${orDash(payload.place)}`,
      `❄️ Кол-во кондиционеров: ${orDash(payload.qty)}`,
      `⏰ Удобное время звонка: ${orDash(payload.callTime)}`,
      `💬 Комментарий: ${orDash(payload.comment)}`,
    ].join('\n');
  }

  if (payload.kind === 'to-reminder') {
    return [
      '🔔 Запрос напоминания о ТО',
      `📞 Телефон: ${payload.phone}`,
      `📅 ${orDash(payload.when)}`,
    ].join('\n');
  }

  const who = payload.district === null ? payload.name : `${payload.name} · ${payload.district}`;
  return [
    '⭐ Новый отзыв на модерации',
    '',
    `👤 ${who}`,
    `★ Оценка: ${payload.rating}/5`,
    `💬 ${payload.text}`,
    '',
    `ID: ${payload.reviewId}`,
  ].join('\n');
}

export function notificationSubject(payload: NotificationPayload): string {
  if (payload.kind === 'lead') return `Новая заявка с сайта: ${payload.topic}`;
  if (payload.kind === 'to-reminder') return 'Запрос напоминания о ТО';
  return `Новый отзыв на модерации: ${payload.rating}/5`;
}

/** Ссылка в админку — чтобы из письма можно было сразу открыть обращение. */
export function adminLink(payload: NotificationPayload): string {
  const path = payload.kind === 'review' ? ADMIN_REVIEWS_PATH : ADMIN_LEADS_PATH;
  return new URL(path, env.SITE_URL).toString();
}

/** Фото, приложенное к обращению; у напоминания о ТО его не бывает. */
export function attachedPhoto(payload: NotificationPayload): string | null {
  return payload.kind === 'to-reminder' ? null : payload.photo;
}
