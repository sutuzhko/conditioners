/** Отправка формы входа и разбор ответа — контракт docs/API.md §1. */
import { adminLoginContent as texts } from './content';
import { loginSchema, type LoginFieldErrors, type LoginResult, type LoginValues } from './model';

export const emptyLoginValues: LoginValues = { login: '', password: '' };

/** Разбор ошибок Zod в карту «поле → сообщение» для подписей под полями. */
export function validateLoginValues(values: LoginValues): LoginFieldErrors {
  const parsed = loginSchema.safeParse(values);
  if (parsed.success) return {};

  const errors: LoginFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (field === 'login' || field === 'password') {
      errors[field] ??= issue.message;
    }
  }
  return errors;
}

/**
 * Ответ сервера: 204 — вошли, 401 — не подошло, 429 — перебор.
 *
 * Сеть считается ненадёжной: упавший `fetch` — это не «неверный пароль», и
 * сообщение должно отличаться, иначе владелец будет искать ошибку в пароле.
 */
export async function postLogin(values: LoginValues): Promise<LoginResult> {
  let response: Response;
  try {
    response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  } catch {
    return { ok: false, message: texts.network };
  }

  if (response.ok) return { ok: true };

  if (response.status === 429) {
    const retryAfterSec = Number(response.headers.get('Retry-After')) || 60;
    return { ok: false, message: texts.rateLimited(retryAfterSec), retryAfterSec };
  }

  return { ok: false, message: texts.failed };
}
