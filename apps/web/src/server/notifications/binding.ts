import { createHmac } from 'node:crypto';

import { safeEqual } from '@/server/auth';
import { env } from '@/shared/config/env';

/**
 * Привязка чата Telegram к учётной записи.
 *
 * 🔴 Chat ID человек не знает и узнать сам не может: его выдаёт телеграм, а не
 * поле для ввода. Поэтому привязка идёт с той стороны — человек пишет боту
 * код, бот запоминает чат, из которого код пришёл.
 *
 * 🔴 Чужую учётную запись так не привязать. Код — это HMAC от `SESSION_SECRET`
 * и идентификатора человека: подобрать его нельзя, вычислить снаружи — тоже,
 * секрет не покидает сервер (инвариант 3). Код живёт получасовое окно и виден
 * только в панели, то есть только тому, кто в неё вошёл. Ни одного адреса и
 * ни одного идентификатора в самом коде нет: он ничего не сообщает тому, кто
 * его перехватил, кроме права на одну привязку в ближайшие полчаса.
 */

/** Окно жизни кода. Полчаса — столько, чтобы успеть продиктовать по телефону. */
export const BINDING_WINDOW_MS = 30 * 60_000;

/**
 * Алфавит без пар, которые путают при диктовке и наборе: ноль и «O», единица
 * и «I». Код называют вслух — читаемость здесь важнее двух лишних битов.
 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

const CODE_PATTERN = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

function windowIndex(now: Date): number {
  return Math.floor(now.getTime() / BINDING_WINDOW_MS);
}

function codeFor(userId: string, index: number): string {
  const digest = createHmac('sha256', env.SESSION_SECRET)
    .update(`telegram-bind:${userId}:${index}`)
    .digest();

  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    // байт дайджеста → символ алфавита; смещение алфавита к длине не приводим:
    // 32 символа делят 256 нацело, перекоса частот нет
    code += ALPHABET[(digest[i] ?? 0) % ALPHABET.length];
  }
  return code;
}

/** Код, который панель показывает человеку прямо сейчас. */
export function bindingCode(userId: string, now: Date = new Date()): string {
  return codeFor(userId, windowIndex(now));
}

/**
 * Подходит ли код этой учётной записи. Принимаются текущее и предыдущее окно:
 * код, показанный в 10:29, обязан работать в 10:31 — иначе человек не поймёт,
 * что именно он сделал не так.
 */
export function verifyBindingCode(userId: string, code: string, now: Date = new Date()): boolean {
  const index = windowIndex(now);
  const candidate = normalizeCode(code);
  if (candidate === null) return false;

  return (
    safeEqual(candidate, codeFor(userId, index)) || safeEqual(candidate, codeFor(userId, index - 1))
  );
}

/** Код из сообщения: регистр и пробелы человек путает, смысл кода — нет. */
export function normalizeCode(value: string): string | null {
  const cleaned = value.trim().toUpperCase().replace(/[\s-]/g, '');
  return CODE_PATTERN.test(cleaned) ? cleaned : null;
}

/**
 * Что человек написал боту.
 *
 * Голый код принимается наравне с командой: `/start` приходит из ссылки, а
 * человек, которому код продиктовали, просто отправляет его в чат.
 */
export type ChatCommand =
  | { readonly kind: 'bind'; readonly code: string }
  | { readonly kind: 'unbind' }
  | { readonly kind: 'help' };

export function parseChatCommand(text: string | undefined): ChatCommand | null {
  const value = text?.trim() ?? '';
  if (value === '') return null;

  // `/start@tulaklimat_bot` — так команда приходит из группового чата
  const [rawCommand = '', ...rest] = value.split(/\s+/);
  const command = rawCommand.split('@')[0]?.toLowerCase() ?? '';
  const argument = rest.join('');

  if (command === '/stop' || command === '/unbind') return { kind: 'unbind' };

  if (command === '/start' || command === '/bind') {
    const code = normalizeCode(argument);
    return code === null ? { kind: 'help' } : { kind: 'bind', code };
  }

  const bare = normalizeCode(value);
  if (bare !== null) return { kind: 'bind', code: bare };

  // не команда: бот не собеседник, отвечать на всё подряд ему незачем
  return null;
}

/** Ответы бота. Человек по ту сторону должен понять, что делать дальше. */
export const bindingReplies = {
  help:
    'Чтобы получать сюда наряды, откройте панель и попросите код привязки ' +
    'в разделе «Уведомления». Пришлите его сюда одним сообщением — код ' +
    'действует полчаса.',
  unknownCode:
    'Код не подошёл: он либо набран с ошибкой, либо уже устарел. ' +
    'Возьмите новый код в разделе «Уведомления» — он действует полчаса.',
  bound: (name: string): string =>
    `Готово, ${name}. Наряды и изменения по ним будут приходить в этот чат. ` +
    'Чтобы отписаться, отправьте /stop.',
  unbound:
    'Отписались: наряды в этот чат больше не придут. ' +
    'Привязать заново можно новым кодом из раздела «Уведомления».',
  notBound: 'Этот чат ни к кому не привязан — отписываться не от чего.',
} as const;
