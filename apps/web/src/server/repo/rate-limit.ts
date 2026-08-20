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

export async function hit(
  key: string,
  limit: number,
  windowMs: number,
  now: Date = new Date(),
): Promise<RateLimitVerdict> {
  const startedAt = Math.floor(now.getTime() / windowMs) * windowMs;
  const windowAt = new Date(startedAt);

  const row = await db.rateLimit.upsert({
    where: { key_windowAt: { key, windowAt } },
    create: { key, windowAt, hits: 1 },
    update: { hits: { increment: 1 } },
  });

  return {
    allowed: row.hits <= limit,
    hits: row.hits,
    retryAfterSec: Math.max(1, Math.ceil((startedAt + windowMs - now.getTime()) / 1000)),
  };
}

/** После удачного входа счётчик неудач сбрасывается. */
export async function reset(key: string): Promise<void> {
  await db.rateLimit.deleteMany({ where: { key } });
}

/** Старые окна не нужны никому — чистятся попутно, отдельного крона не заводим. */
export async function dropOlderThan(before: Date): Promise<void> {
  await db.rateLimit.deleteMany({ where: { windowAt: { lt: before } } });
}
