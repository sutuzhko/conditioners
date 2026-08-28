/**
 * Вход в админку — docs/API.md §1.
 *
 * Ответ одинаков и для неизвестного логина, и для неверного пароля: подсказывать
 * перебирающему, что логин угадан, не нужно.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  SESSION_COOKIE,
  clientIp,
  login as authenticate,
  sessionCookieOptions,
} from '@/server/auth';
import { apiError, readJson, validationError, withSessionRoute } from '@/server/http';

export const dynamic = 'force-dynamic';

const schema = z
  .object({
    login: z.string().trim().min(1, 'Введите логин').max(120),
    password: z.string().min(1, 'Введите пароль').max(200),
  })
  .strict();

export const POST = withSessionRoute(async (request) => {
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const result = await authenticate({
    login: parsed.data.login,
    password: parsed.data.password,
    ip: clientIp(request),
    currentToken: request.cookies.get(SESSION_COOKIE)?.value,
  });

  if (!result.ok) {
    if (result.reason === 'rate_limited') {
      return apiError('rate_limited', 'Слишком много попыток входа. Попробуйте позже', {
        headers: { 'Retry-After': String(result.retryAfterSec) },
      });
    }
    if (result.reason === 'disabled') {
      return apiError('forbidden', 'Доступ к панели закрыт. Обратитесь к владельцу');
    }
    return apiError('unauthorized', 'Неверный логин или пароль');
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresAt));
  return response;
});
