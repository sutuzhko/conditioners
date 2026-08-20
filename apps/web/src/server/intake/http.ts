import { ZodError } from 'zod';

/**
 * Формат ошибок публичного API — docs/API.md §11. Текст `message` видит
 * пользователь, поэтому он по-русски и объясняет, что делать дальше;
 * технические подробности уходят в лог, а не в ответ.
 */
export type ApiErrorCode =
  'validation_error' | 'payload_too_large' | 'rate_limited' | 'internal_error';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly field: string | undefined;

  constructor(status: number, code: ApiErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // ответы на формы не должны попадать ни в один кеш по пути к клиенту
      'cache-control': 'no-store',
    },
  });
}

export function errorResponse(error: ApiError): Response {
  const body =
    error.field === undefined
      ? { error: { code: error.code, message: error.message } }
      : { error: { code: error.code, message: error.message, field: error.field } };
  return jsonResponse(body, error.status);
}

/** Русский текст для проваленной проверки Zod: берём первую проблему — её и показываем. */
function fromZodError(error: ZodError): ApiError {
  const issue = error.issues[0];
  if (issue === undefined) {
    return new ApiError(400, 'validation_error', 'Проверьте заполнение формы.');
  }
  const field = issue.path.map(String).join('.');
  return new ApiError(400, 'validation_error', issue.message, field === '' ? undefined : field);
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ZodError) return fromZodError(error);
  console.error('Необработанная ошибка публичного эндпоинта', error);
  return new ApiError(
    500,
    'internal_error',
    'Не получилось обработать запрос. Попробуйте ещё раз через минуту или позвоните нам.',
  );
}
