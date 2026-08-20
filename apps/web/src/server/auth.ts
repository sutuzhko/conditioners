/**
 * Сессия админки — docs/TECH_DECISIONS §8.
 *
 * Токен живёт в httpOnly + Secure + SameSite=Lax cookie, в базе хранится только
 * его HMAC: дамп базы не даёт возможности войти. При входе токен ротируется,
 * старая сессия аннулируется — иначе заранее подсунутый cookie переживёт вход
 * (session fixation).
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { verify as verifyPassword, hash as hashPasswordArgon } from '@node-rs/argon2';
import { env } from '@/shared/config/env';
import * as adminUsers from '@/server/repo/admin-users';
import * as sessions from '@/server/repo/sessions';
import * as rateLimit from '@/server/repo/rate-limit';

export const SESSION_COOKIE = 'session';

/** 30 дней — срок из TECH_DECISIONS §8. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export type AdminSession = {
  userId: string;
  login: string;
  expiresAt: Date;
};

export type SessionCookieOptions = {
  httpOnly: true;
  secure: true;
  sameSite: 'lax';
  path: string;
  expires: Date;
};

export function hashToken(token: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(token).digest('hex');
}

function createToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sessionCookieOptions(expires: Date): SessionCookieOptions {
  // Secure в деве не мешает: сайт открывается через Caddy по https.
  return { httpOnly: true, secure: true, sameSite: 'lax', path: '/', expires };
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

  return { userId: stored.userId, login: stored.login, expiresAt: stored.expiresAt };
}

/** Сессия текущего запроса. Возвращает null, а не бросает: решение об ответе — за обработчиком. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return readSession(store.get(SESSION_COOKIE)?.value);
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (token === undefined || token === '') return;
  await sessions.deleteByTokenHash(hashToken(token));
}

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; reason: 'invalid_credentials' }
  | { ok: false; reason: 'rate_limited'; retryAfterSec: number };

export async function login(params: {
  login: string;
  password: string;
  ip: string;
  currentToken?: string | undefined;
  now?: Date | undefined;
}): Promise<LoginResult> {
  const now = params.now ?? new Date();
  const verdict = await rateLimit.hit(
    `login:${params.ip}`,
    LOGIN_ATTEMPT_LIMIT,
    LOGIN_WINDOW_MS,
    now,
  );

  if (!verdict.allowed) {
    return { ok: false, reason: 'rate_limited', retryAfterSec: verdict.retryAfterSec };
  }

  const user = await adminUsers.findByLogin(params.login);
  if (user === null) return { ok: false, reason: 'invalid_credentials' };

  const passwordOk = await verifyPassword(user.passwordHash, params.password).catch(() => false);
  if (!passwordOk) return { ok: false, reason: 'invalid_credentials' };

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

/** IP берём из заголовка прокси: приложение всегда стоит за Caddy. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded !== null && forwarded.length > 0) {
    const first = forwarded.split(',')[0]?.trim();
    if (first !== undefined && first !== '') return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Сравнение секретов постоянного времени — для вебхуков и служебных вызовов. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
