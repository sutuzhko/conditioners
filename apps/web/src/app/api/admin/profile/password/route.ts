/**
 * Смена своего пароля.
 *
 * Текущий пароль обязателен: сессия могла остаться открытой на чужом
 * компьютере, и смена пароля без проверки — подарок тому, кто её нашёл.
 */
import { passwordChangeSchema } from '@/entities/staff/model';
import { SESSION_COOKIE, changePassword } from '@/server/auth';
import { apiError, noContent, readJson, validationError, withAdmin } from '@/server/http';

export const dynamic = 'force-dynamic';

export const POST = withAdmin(async (request, _context, session) => {
  const parsed = passwordChangeSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const result = await changePassword({
    userId: session.userId,
    currentToken: request.cookies.get(SESSION_COOKIE)?.value,
    current: parsed.data.current,
    next: parsed.data.next,
  });

  if (result === 'invalid_current') {
    return apiError('validation_error', 'Текущий пароль не подошёл', { field: 'current' });
  }

  return noContent();
});
