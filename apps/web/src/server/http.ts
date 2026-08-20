/**
 * Единый конверт ответов API — docs/API.md §11.
 *
 * Текст `message` уходит пользователю, поэтому он по-русски и объясняет, что
 * делать. Технические подробности пишутся в лог и наружу не отдаются.
 */
import { NextResponse, type NextRequest } from 'next/server';
import type { ZodError } from 'zod';
import { getAdminSession, type AdminSession } from '@/server/auth';

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
    ...(options.headers === undefined ? {} : { headers: options.headers }),
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

  return apiError('validation_error', issue?.message ?? 'Проверьте заполнение полей', { field });
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
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
    return apiError(error.code, error.message, { field: error.field });
  }
  console.error('Необработанная ошибка обработчика:', error);
  return apiError('internal_error', 'Что-то пошло не так. Попробуйте ещё раз');
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
