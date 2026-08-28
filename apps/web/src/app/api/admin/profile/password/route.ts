/**
 * Смена своего пароля.
 *
 * Текущий пароль обязателен: сессия могла остаться открытой на чужом
 * компьютере, и смена пароля без проверки — подарок тому, кто её нашёл.
 */
import { passwordChangeSchema } from '@/entities/staff/model';
import { SESSION_COOKIE, changePassword } from '@/server/auth';
import {
  PASSWORD_CHANGE_RATE_LIMIT as RULE,
  apiError,
  noContent,
  readJson,
  validationError,
  withAdmin,
} from '@/server/http';
import { hit, reset } from '@/server/repo/rate-limit';

export const dynamic = 'force-dynamic';

export const POST = withAdmin(async (request, _context, session) => {
  const parsed = passwordChangeSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  /* 🔴 Тот же счётчик, что у входа, и с тем же поведением при отказе базы:
     без него текущий пароль перебирается из-под найденной сессии без всякой
     платы. Ключ по учётной записи, а не по адресу: перебирает тот, кто сидит
     за компьютером хозяина, и адрес у него хозяйский.

     Счётчик стоит после разбора схемы: пустое поле — это не попытка подбора,
     и запирать человека за опечатку в форме незачем. */
  const attempts = await hit(
    `password:${session.userId}`,
    RULE.limit,
    RULE.windowMs,
    new Date(),
    'closed',
  );

  if (!attempts.allowed) {
    return apiError('rate_limited', 'Слишком много попыток смены пароля. Попробуйте позже', {
      headers: { 'Retry-After': String(attempts.retryAfterSec) },
    });
  }

  const result = await changePassword({
    userId: session.userId,
    currentToken: request.cookies.get(SESSION_COOKIE)?.value,
    current: parsed.data.current,
    next: parsed.data.next,
  });

  if (result === 'invalid_current') {
    return apiError('validation_error', 'Текущий пароль не подошёл', { field: 'current' });
  }

  // Пароль вспомнили — счётчик неудач больше ничего не охраняет, как и у входа.
  await reset(`password:${session.userId}`);

  return noContent();
});
