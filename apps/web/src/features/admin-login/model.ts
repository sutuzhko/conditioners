/**
 * Вход в админку — тип формы и её состояния.
 *
 * Схема одна и та же на клиенте и на сервере (`app/api/auth/login/route.ts`):
 * клиентская валидация здесь — это подсказка, а не защита.
 */
import { z } from 'zod';

export const loginSchema = z
  .object({
    login: z.string().trim().min(1, 'Введите логин').max(120),
    password: z.string().min(1, 'Введите пароль').max(200),
  })
  .strict();

export type LoginValues = z.infer<typeof loginSchema>;

/** Порядок полей: на первую ошибку переводим фокус, и он должен быть верхним. */
export const LOGIN_FIELD_ORDER = ['login', 'password'] as const;

export type LoginFieldErrors = Partial<Record<keyof LoginValues, string>>;

export type LoginStatus = 'idle' | 'sending' | 'error';

/**
 * Результат попытки входа. Успех не возвращает ничего: сессия приходит
 * cookie, а дальше форма отдаёт управление навигации.
 */
export type LoginResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string; readonly retryAfterSec?: number };

export type LoginSubmit = (values: LoginValues) => Promise<LoginResult>;
