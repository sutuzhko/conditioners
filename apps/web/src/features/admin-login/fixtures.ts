/** Данные для историй и тестов формы входа. */
import type { LoginResult, LoginSubmit } from './model';

export const successSubmit: LoginSubmit = async () => ({ ok: true });

export const failedSubmit: LoginSubmit = async () => ({
  ok: false,
  message: 'Неверный логин или пароль',
});

export const rateLimitedSubmit: LoginSubmit = async () => ({
  ok: false,
  message: 'Слишком много попыток. Попробуйте через 5 мин',
  retryAfterSec: 300,
});

/** Отправка, которая не завершается: состояние `sending` в истории. */
export const pendingSubmit: LoginSubmit = () => new Promise<LoginResult>(() => {});
