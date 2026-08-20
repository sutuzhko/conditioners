/**
 * Единый конверт ответов API — docs/API.md §11.
 *
 * Текст `message` уходит пользователю, поэтому он по-русски и объясняет, что
 * делать. Технические подробности пишутся в лог и наружу не отдаются.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { getAdminSession, type AdminSession } from '@/server/auth';
import { hit } from '@/server/repo/rate-limit';

export type ApiErrorCode =
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'payload_too_large'
  | 'rate_limited'
  | 'internal_error';

const STATUS: Record<ApiErrorCode, number> = {
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  payload_too_large: 413,
  rate_limited: 429,
  internal_error: 500,
};

/**
 * Кодировку указываем явно: контракт (docs/API.md) обещает
 * `application/json; charset=utf-8`, а тексты ошибок русские — клиент, который
 * угадает кодировку сам, покажет их вопросительными знаками.
 */
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

/**
 * Ответы на отправку формы не должны попадать ни в один кеш по пути к
 * клиенту: между сайтом и браузером стоит Caddy, а «201 с чужим id» —
 * худшее, что может увидеть человек, оставивший заявку.
 */
export const NO_STORE: Readonly<Record<string, string>> = { 'cache-control': 'no-store' };

export function apiError(
  code: ApiErrorCode,
  message: string,
  options: { field?: string | undefined; headers?: Record<string, string> | undefined } = {},
): NextResponse {
  const body = {
    error: {
      code,
      message,
      ...(options.field === undefined || options.field === '' ? {} : { field: options.field }),
    },
  };

  return NextResponse.json(body, {
    status: STATUS[code],
    headers: { 'content-type': JSON_CONTENT_TYPE, ...(options.headers ?? {}) },
  });
}

export function unauthorized(): NextResponse {
  return apiError('unauthorized', 'Нужно войти в админку');
}

export function notFound(what: string): NextResponse {
  return apiError('not_found', `${what} не найден`);
}

/** Первая ошибка Zod показывается пользователю: список из десяти проблем он не прочитает. */
export function validationError(error: ZodError): NextResponse {
  const issue = error.issues[0];
  const field = issue?.path.join('.') ?? '';

  return apiError('validation_error', issue?.message ?? 'Проверьте заполнение полей', {
    field,
    headers: NO_STORE,
  });
}

export function json<T>(
  data: T,
  status = 200,
  headers: Readonly<Record<string, string>> = {},
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { 'content-type': JSON_CONTENT_TYPE, ...headers },
  });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/** Тело запроса приходит снаружи — распарсить его может не получиться. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/**
 * Ошибка, которую можно показать пользователю. Бросается из глубины
 * (репозиторий, загрузка файла) и превращается в ответ обёрткой маршрута.
 */
export class ApiException extends Error {
  readonly code: ApiErrorCode;
  readonly field: string | undefined;

  constructor(code: ApiErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'ApiException';
    this.code = code;
    this.field = field;
  }
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof ApiException) {
    return apiError(error.code, error.message, { field: error.field, headers: NO_STORE });
  }
  // Публичные обработчики валидируют тело через `parse`, а не `safeParse`:
  // проваленная проверка долетает сюда исключением и обязана стать 400,
  // а не 500 — иначе человек увидит «что-то пошло не так» вместо подсказки.
  if (error instanceof ZodError) return validationError(error);

  console.error('Необработанная ошибка обработчика:', error);
  return apiError(
    'internal_error',
    // Телефон как запасной путь: форма — последний шаг перед заявкой,
    // и тупик на этом шаге стоит владельцу денег (docs/CLAUDE.md, «Формы»).
    'Не получилось обработать запрос. Попробуйте ещё раз через минуту или позвоните нам',
    { headers: NO_STORE },
  );
}

type RouteHandler<Ctx> = (request: NextRequest, context: Ctx) => Promise<Response> | Response;

/** Маршрут админки: без сессии — 401, исключения не утекают наружу стектрейсом. */
export function withAdmin<Ctx>(
  handler: (request: NextRequest, context: Ctx, session: AdminSession) => Promise<Response>,
): RouteHandler<Ctx> {
  return async (request: NextRequest, context: Ctx): Promise<Response> => {
    const session = await getAdminSession();
    if (session === null) return unauthorized();
    try {
      return await handler(request, context, session);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

/** Публичный маршрут: та же обработка ошибок, без проверки сессии. */
export function withRoute<Ctx>(
  handler: (request: NextRequest, context: Ctx) => Promise<Response>,
): RouteHandler<Ctx> {
  return async (request: NextRequest, context: Ctx): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

/**
 * Ограничение частоты обращений к публичным формам (docs/TECH_DECISIONS §10).
 *
 * Сам счётчик живёт в слое доступа к данным (`repo/rate-limit`), здесь —
 * только политика маршрута: сколько попыток допустимо и что видит человек,
 * когда лимит исчерпан.
 */
export type RateLimitRule = {
  readonly limit: number;
  readonly windowMs: number;
};

/** Заявка — главная ценность сайта, поэтому окно щадящее: повтор и опечатка не должны блокироваться. */
export const LEAD_RATE_LIMIT: RateLimitRule = { limit: 5, windowMs: 10 * 60_000 };

/** Отзыв человек пишет один раз, частые повторы с одного адреса — почти всегда бот. */
export const REVIEW_RATE_LIMIT: RateLimitRule = { limit: 3, windowMs: 60 * 60_000 };

/** Адрес клиента виден только из заголовков Caddy: приложение стоит за обратным прокси. */
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

export async function assertWithinRateLimit(
  request: Request,
  endpoint: string,
  rule: RateLimitRule,
): Promise<void> {
  const verdict = await hit(`${clientIp(request)}:${endpoint}`, rule.limit, rule.windowMs);
  if (verdict.allowed) return;

  throw new ApiException(
    'rate_limited',
    'С этого адреса пришло слишком много обращений. Подождите несколько минут и отправьте форму ещё раз или позвоните нам',
  );
}
