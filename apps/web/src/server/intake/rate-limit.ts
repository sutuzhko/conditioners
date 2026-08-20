import { db } from '@/server/db';
import { ApiError } from './http';

/**
 * Ограничение частоты по IP на публичных формах (docs/TECH_DECISIONS.md §10).
 * Счётчик живёт в таблице `RateLimit`, а не в памяти процесса: веб и воркер —
 * разные контейнеры, а перезапуск веба не должен обнулять защиту.
 */
export type RateLimitRule = {
  readonly limit: number;
  readonly windowMs: number;
};

/** Заявка — главная ценность сайта, поэтому окно щадящее: повтор и опечатка не должны блокироваться. */
export const LEAD_RATE_LIMIT: RateLimitRule = { limit: 5, windowMs: 10 * 60_000 };

/** Отзыв человек пишет один раз, частые повторы с одного адреса — почти всегда бот. */
export const REVIEW_RATE_LIMIT: RateLimitRule = { limit: 3, windowMs: 60 * 60_000 };

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded !== null) {
    const first = forwarded.split(',')[0]?.trim();
    if (first !== undefined && first !== '') return first;
  }
  const real = request.headers.get('x-real-ip')?.trim();
  if (real !== undefined && real !== '') return real;
  return 'unknown';
}

/** Начало текущего фиксированного окна — общий ключ для всех запросов внутри него. */
function windowStart(now: number, windowMs: number): Date {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

export async function assertWithinRateLimit(
  request: Request,
  endpoint: string,
  rule: RateLimitRule,
): Promise<void> {
  const key = `${clientIp(request)}:${endpoint}`;
  const windowAt = windowStart(Date.now(), rule.windowMs);

  let hits: number;
  try {
    const row = await db.rateLimit.upsert({
      where: { key_windowAt: { key, windowAt } },
      create: { key, windowAt },
      update: { hits: { increment: 1 } },
    });
    hits = row.hits;
  } catch (error) {
    // Счётчик защищает от спама, а не от потери заявки: если он недоступен,
    // запрос идёт дальше. Отказать честному клиенту дороже, чем пропустить бота.
    console.error('Не удалось учесть частоту обращений', error);
    return;
  }

  if (hits > rule.limit) {
    throw new ApiError(
      429,
      'rate_limited',
      'С этого адреса пришло слишком много обращений. Подождите несколько минут и отправьте форму ещё раз или позвоните нам.',
    );
  }
}

/** Отработавшие окна не нужны — чистит воркер, чтобы таблица не росла бесконечно. */
export async function purgeStaleRateLimits(olderThan: Date): Promise<number> {
  const result = await db.rateLimit.deleteMany({ where: { windowAt: { lt: olderThan } } });
  return result.count;
}
