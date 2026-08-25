/**
 * Счётчик попыток по ключу «что делаем + с какого IP».
 *
 * Окно фиксированное, а не скользящее: для защиты формы входа и публичных POST
 * этого достаточно, а хранение сводится к одной строке на окно (docs/TECH_DECISIONS §10).
 */
import { db } from '@/server/db';

export type RateLimitVerdict = {
  allowed: boolean;
  hits: number;
  /** Через сколько секунд окно закроется — уходит в заголовок Retry-After. */
  retryAfterSec: number;
};

/**
 * Что делать, когда сам счётчик недоступен. У форм и у входа цена ошибки
 * противоположная, поэтому решает вызывающий:
 * `open` — пропустить (формы: отказать живому клиенту дороже, чем пропустить
 * бота, инвариант 2); `closed` — отказать (вход: без счётчика перебор пароля
 * не ограничен ничем, аудит, BUGS).
 */
export type RateLimitFailMode = 'open' | 'closed';

export async function hit(
  key: string,
  limit: number,
  windowMs: number,
  now: Date = new Date(),
  failMode: RateLimitFailMode = 'open',
): Promise<RateLimitVerdict> {
  const startedAt = Math.floor(now.getTime() / windowMs) * windowMs;
  const windowAt = new Date(startedAt);
  const retryAfterSec = Math.max(1, Math.ceil((startedAt + windowMs - now.getTime()) / 1000));

  let hits: number;
  try {
    const row = await db.rateLimit.upsert({
      where: { key_windowAt: { key, windowAt } },
      create: { key, windowAt, hits: 1 },
      update: { hits: { increment: 1 } },
    });
    hits = row.hits;
  } catch (error) {
    console.error('Не удалось учесть частоту обращений', error);
    return { allowed: failMode === 'open', hits: 0, retryAfterSec };
  }

  return { allowed: hits <= limit, hits, retryAfterSec };
}

/** После удачного входа счётчик неудач сбрасывается. */
export async function reset(key: string): Promise<void> {
  await db.rateLimit.deleteMany({ where: { key } });
}

/** Старые окна не нужны никому — чистятся попутно, отдельного крона не заводим. */
export async function dropOlderThan(before: Date): Promise<void> {
  await db.rateLimit.deleteMany({ where: { windowAt: { lt: before } } });
}
