import type { Contacts, Integrations } from '@/entities/settings/model';
import { phoneKey } from '@/shared/lib/phone';

/**
 * Кнопки быстрой связи из настроек (issue #680, ADR-024).
 *
 * 🔴 Кнопка появляется по **двум** условиям сразу: переключатель в группе
 * «Счётчики и интеграции» и заполненный адрес в группе «Контакты». Флаг без
 * адреса — это ссылка в никуда, а адрес без флага владелец не включал.
 *
 * Своих ссылок здесь нет и быть не может: адрес чата — факт о компании и
 * живёт в базе (инвариант 8).
 */

/** Какой мессенджер: набор закрыт настройками, третьего в схеме нет. */
export type MessengerKind = 'telegram' | 'whatsapp';

export interface MessengerLink {
  readonly kind: MessengerKind;
  /** Готовый абсолютный адрес: `https://t.me/...`, `https://wa.me/...`. */
  readonly href: string;
}

/** Значение похоже на готовый адрес, а не на имя или номер. */
function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Адрес канала Telegram.
 *
 * Поле в настройках — свободный текст, и владелец пишет туда то, что у него
 * под рукой: ссылку целиком, `t.me/имя` без схемы или `@имя` из профиля.
 * Все три записи означают один и тот же адрес, и разбирать их обязан код —
 * иначе кнопка ведёт на `/@имя` внутри сайта.
 */
function telegramHref(value: string): string | null {
  if (isUrl(value)) return value;
  if (value.startsWith('t.me/')) return `https://${value}`;

  const name = value.startsWith('@') ? value.slice(1) : value;

  // имя канала: латиница, цифры и подчёркивание — так его задаёт Telegram
  return /^[A-Za-z][\w]{3,31}$/.test(name) ? `https://t.me/${name}` : null;
}

/**
 * Адрес переписки в WhatsApp.
 *
 * 🔴 Номер приводится к тому же каноническому виду, что и телефон заявки
 * (`phoneKey`): владелец пишет «+7 (910) 155-24-68», а `wa.me` принимает
 * только цифры. Иначе кнопка молча открывает пустой чат.
 */
function whatsappHref(value: string): string | null {
  if (isUrl(value)) return value;

  const digits = phoneKey(value);

  return digits.length >= 10 ? `https://wa.me/${digits}` : null;
}

const HREF_OF: Readonly<Record<MessengerKind, (value: string) => string | null>> = {
  telegram: telegramHref,
  whatsapp: whatsappHref,
};

/**
 * Кнопки, которые сайт имеет право показать. Порядок постоянный: Telegram
 * первым — это же основной канал уведомлений владельца (ADR-058).
 */
export function messengerLinks(
  contacts: Contacts,
  integrations: Integrations,
): readonly MessengerLink[] {
  const kinds: readonly MessengerKind[] = ['telegram', 'whatsapp'];

  return kinds.flatMap((kind) => {
    if (!integrations.messengerButtons[kind]) return [];

    const value = contacts[kind].trim();
    if (value === '') return [];

    const href = HREF_OF[kind](value);

    return href === null ? [] : [{ kind, href }];
  });
}
