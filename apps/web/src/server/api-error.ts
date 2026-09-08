/**
 * Ошибка API и её код — docs/API.md §16.
 *
 * 🔴 Отдельный модуль, а не часть `server/http`, и причина не в размере файла.
 * `ApiException` бросают четырнадцать репозиториев, `http` ради сессии
 * импортирует `auth`, а `auth` — `repo/admin-users`: пока класс лежал в `http`,
 * круг импортов замыкался, и на полпути по нему `http` получал настоящий
 * `getAdminSession` мимо подмены в тестах (ADR-149). Обходили это подменой
 * `repo/admin-users` пустым модулем — то есть ценой невозможности проверить
 * маршрут вместе с его репозиторием, а ровно в этом зазоре и живут дефекты
 * разграничения.
 *
 * 🔴 Модуль не импортирует ничего. Это не аскеза, а условие: первый же импорт
 * из `server/*` вернёт круг на место.
 */
export type ApiErrorCode =
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'payload_too_large'
  | 'rate_limited'
  | 'internal_error';

export const STATUS: Record<ApiErrorCode, number> = {
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  /* 409 — «за это время карточку изменил кто-то другой». Отличается от 400:
     тело запроса верное, изменилось состояние на сервере. */
  conflict: 409,
  payload_too_large: 413,
  rate_limited: 429,
  internal_error: 500,
};

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
