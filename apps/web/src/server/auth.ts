/**
 * Сессия админки — docs/TECH_DECISIONS §8.
 *
 * Токен живёт в httpOnly + Secure + SameSite=Lax cookie (Secure — по схеме
 * SITE_URL, см. `isSecureSite`), в базе хранится только его HMAC: дамп базы
 * не даёт возможности войти. При входе токен ротируется,
 * старая сессия аннулируется — иначе заранее подсунутый cookie переживёт вход
 * (session fixation).
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { verify as verifyPassword, hash as hashPasswordArgon } from '@node-rs/argon2';
import type { AdminRole } from '@/entities/staff/model';
import { env } from '@/shared/config/env';
import * as adminUsers from '@/server/repo/admin-users';
import * as sessions from '@/server/repo/sessions';
import * as rateLimit from '@/server/repo/rate-limit';

export const SESSION_COOKIE = 'session';

/** 30 дней — срок из TECH_DECISIONS §8. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Хеш случайной строки — только для выравнивания времени ответа при неизвестном логине. */
const PHANTOM_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$3CvWzJNnqto4mLjKM5vDjg$bxlsqKaZOBxzWxbFs5L0RpQDuoEFP74iJhGiYXOWln8';

export type AdminSession = {
  userId: string;
  login: string;
  name: string | null;
  role: AdminRole;
  expiresAt: Date;
};

/** Владелец видит панель целиком, монтажник — свои наряды, календарь и профиль. */
export function isOwner(session: AdminSession): boolean {
  return session.role === 'owner';
}

type SessionCookieAttrs = {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
};

export type SessionCookieOptions = SessionCookieAttrs & { expires: Date };
export type ExpiredSessionCookieOptions = SessionCookieAttrs & { maxAge: 0 };

export function hashToken(token: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(token).digest('hex');
}

function createToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Отдаётся ли сайт по https — от этого зависит флаг Secure у cookie (ADR-102).
 *
 * Secure-cookie, пришедшую по http, браузер выбрасывает молча: вход отвечал
 * 204, cookie исчезала, middleware возвращал на форму — снаружи неотличимо от
 * неверного пароля. Дев-стенд поднят по http и открывается по адресу машины,
 * поэтому там флага нет. На проде схему https требует Zod-схема ENV, так что
 * правкой SITE_URL защиту не снять.
 */
export function isSecureSite(siteUrl: string): boolean {
  return new URL(siteUrl).protocol === 'https:';
}

function sessionCookieAttrs(): SessionCookieAttrs {
  return { httpOnly: true, secure: isSecureSite(env.SITE_URL), sameSite: 'lax', path: '/' };
}

export function sessionCookieOptions(expires: Date): SessionCookieOptions {
  return { ...sessionCookieAttrs(), expires };
}

/**
 * Гашение cookie при выходе. Атрибуты повторяют выданные из одного источника:
 * cookie с другим path браузер не заменит, а лишний Secure по http отбросит
 * саму команду гашения — и сессия останется в браузере.
 */
export function expiredSessionCookieOptions(): ExpiredSessionCookieOptions {
  return { ...sessionCookieAttrs(), maxAge: 0 };
}

export async function issueSession(
  userId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = createToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await sessions.create(userId, hashToken(token), expiresAt);
  return { token, expiresAt };
}

export async function readSession(
  token: string | undefined,
  now: Date = new Date(),
): Promise<AdminSession | null> {
  if (token === undefined || token === '') return null;

  const stored = await sessions.findByTokenHash(hashToken(token));
  if (stored === null) return null;

  if (stored.expiresAt.getTime() <= now.getTime()) {
    // Просроченные чистим по ходу дела — отдельный крон ради этого не нужен.
    await sessions.deleteExpired(now);
    return null;
  }

  /* Отключение доступа обязано действовать сразу, а не через тридцать дней:
     у уволенного монтажника cookie в телефоне остаётся рабочим. */
  if (!stored.active) return null;

  return {
    userId: stored.userId,
    login: stored.login,
    name: stored.name,
    role: stored.role,
    expiresAt: stored.expiresAt,
  };
}

/**
 * Сессия текущего запроса. Возвращает null, а не бросает: решение об ответе —
 * за обработчиком.
 *
 * Обёрнута в `cache`: за один запрос сессию спрашивают и layout панели, и
 * сама страница (ADR-095), и обе проверки настоящие — но ходить в базу
 * дважды за одним и тем же незачем.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const store = await cookies();
  return readSession(store.get(SESSION_COOKIE)?.value);
});

export async function destroySession(token: string | undefined): Promise<void> {
  if (token === undefined || token === '') return;
  await sessions.deleteByTokenHash(hashToken(token));
}

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; reason: 'invalid_credentials' }
  | { ok: false; reason: 'disabled' }
  | { ok: false; reason: 'rate_limited'; retryAfterSec: number };

export async function login(params: {
  login: string;
  password: string;
  ip: string;
  currentToken?: string | undefined;
  now?: Date | undefined;
}): Promise<LoginResult> {
  const now = params.now ?? new Date();
  // 🔴 fail-closed: у форм недоступный счётчик пропускает запрос (инвариант 2),
  // у входа — наоборот: без счётчика перебор пароля не ограничен ничем
  const verdict = await rateLimit.hit(
    `login:${params.ip}`,
    LOGIN_ATTEMPT_LIMIT,
    LOGIN_WINDOW_MS,
    now,
    'closed',
  );

  if (!verdict.allowed) {
    return { ok: false, reason: 'rate_limited', retryAfterSec: verdict.retryAfterSec };
  }

  const user = await adminUsers.findByLogin(params.login);
  if (user === null) {
    /* Выравнивание времени: без этой проверки ответ на неизвестный логин
       уходил без argon2 — на десятки миллисекунд быстрее, чем на неверный
       пароль, и перебор отличал существующие логины по паузе (найдено
       тестами входа; аудит, BUGS). Хеш — от случайной строки, совпадение
       с чьим-либо паролем исключено, результат не используется. */
    await verifyPassword(PHANTOM_PASSWORD_HASH, params.password).catch(() => false);
    return { ok: false, reason: 'invalid_credentials' };
  }

  const passwordOk = await verifyPassword(user.passwordHash, params.password).catch(() => false);
  if (!passwordOk) return { ok: false, reason: 'invalid_credentials' };

  /* Отдельная причина, а не «неверный логин или пароль»: до этой ветки
     доходит только тот, кто пароль знает, — значит, подсказка ничего не
     раскрывает, зато человек понимает, что звонить надо владельцу. */
  if (!user.active) return { ok: false, reason: 'disabled' };

  // Ротация: cookie, с которым пришли, перестаёт работать.
  await destroySession(params.currentToken);
  await sessions.deleteExpired(now);
  await rateLimit.reset(`login:${params.ip}`);

  const issued = await issueSession(user.id, now);
  await adminUsers.markLogin(user.id, now);

  return { ok: true, ...issued };
}

/** Хеш пароля для заведения администратора. Argon2id — параметры по умолчанию @node-rs/argon2. */
export function hashPassword(password: string): Promise<string> {
  return hashPasswordArgon(password);
}

/**
 * Смена своего пароля.
 *
 * Все прочие сессии этого человека закрываются: смена пароля — обычная
 * реакция на «кажется, кто-то знает мой пароль», и она обязана выгонять того,
 * кто уже вошёл. Текущая сессия остаётся: выкидывать человека из панели
 * ровно за то, что он сделал правильную вещь, — плохая награда.
 */
export async function changePassword(params: {
  userId: string;
  currentToken: string | undefined;
  current: string;
  next: string;
}): Promise<'ok' | 'invalid_current'> {
  const stored = await adminUsers.findPasswordHash(params.userId);
  if (stored === null) return 'invalid_current';

  const ok = await verifyPassword(stored, params.current).catch(() => false);
  if (!ok) return 'invalid_current';

  await adminUsers.setPasswordHash(params.userId, await hashPassword(params.next));
  await logoutOtherSessions(params.userId, params.currentToken);

  return 'ok';
}

/**
 * Закрыть все сессии человека, кроме текущей.
 *
 * 🔴 Текущая остаётся намеренно: и смена пароля, и кнопка «Выйти на всех
 * устройствах» — реакция на «кажется, кто-то знает мой пароль». Выкинуть
 * человека из панели за то, что он сделал правильную вещь, значит заставить
 * его вводить пароль ещё раз на том самом устройстве, с которого он и наводит
 * порядок.
 *
 * Токен без cookie (запрос пришёл без неё) закрывает вообще все сессии: пустой
 * хеш не совпадает ни с одной записью, и сохранять нечего.
 */
export async function logoutOtherSessions(
  userId: string,
  currentToken: string | undefined,
): Promise<void> {
  await sessions.deleteOtherForUser(
    userId,
    currentToken === undefined ? '' : hashToken(currentToken),
  );
}

/* Общая реализация переехала в server/client-ip (аудит: две копии разошлись
   в порядке доверия заголовкам); реэкспорт сохраняет привычный адрес. */
export { clientIp } from '@/server/client-ip';

/** Сравнение секретов постоянного времени — для вебхуков и служебных вызовов. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
