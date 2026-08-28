/** Отправка формы входа и разбор ответа — контракт docs/API.md §1. */
import { adminLoginContent as texts } from './content';
import { loginSchema, type LoginFieldErrors, type LoginResult, type LoginValues } from './model';

export const emptyLoginValues: LoginValues = { login: '', password: '' };

/** Куда возвращать, когда просить назад нечего или адрес не наш. */
const ADMIN_HOME = '/admin';

/**
 * Точка отсчёта для разбора. Домен нарочно недостижимый: никуда по нему не
 * ходят, он нужен только чтобы относительному пути было от чего считаться.
 */
const BASE = 'https://redirect.invalid';

/**
 * Адрес возврата после входа.
 *
 * Значение приходит из строки запроса, то есть от кого угодно, и уходит в
 * `window.location.assign`. Пропускаем только свои пути: иначе владелец,
 * кликнувший `/admin/login?next=…`, после **успешного** входа оказывается на
 * клоне панели с формой «повторите пароль».
 *
 * 🔴 Решает разбор тем же парсером, который потом исполнит адрес, а не
 * проверка строки: парсер выбрасывает табуляцию, перевод строки и возврат
 * каретки **до** разбора, поэтому `/\t/злодей.example` становится
 * `//злодей.example` — адресом, относительным протоколу. Обратный слэш в
 * начале пути он тоже считает прямым. Любая проверка сырой строки перечисляет
 * причуды парсера и отстаёт от них; сверка origin учитывает их все разом.
 *
 * Побочная польза: наружу уходит нормализованный путь, а не сырая строка.
 */
export function safeRedirectTo(next: string | undefined): string {
  if (next === undefined) return ADMIN_HOME;

  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return ADMIN_HOME;
  }

  if (url.origin !== BASE) return ADMIN_HOME;

  const path = `${url.pathname}${url.search}${url.hash}`;

  /* Корень — это не адрес возврата: пустой `next` обязан вести в панель, а не
     выкидывать только что вошедшего на витрину. */
  return path === '/' ? ADMIN_HOME : path;
}

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
