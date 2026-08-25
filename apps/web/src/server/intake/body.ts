import { ApiException } from '@/server/http';

/**
 * Чтение тела публичной формы. Понимает `multipart/form-data` (основной формат
 * по docs/API.md §7–8), а также JSON и `application/x-www-form-urlencoded` —
 * маленькие формы вроде напоминания о ТО отправляются без файлов.
 */
export type IntakeBody = {
  readonly fields: Readonly<Record<string, string>>;
  readonly files: ReadonlyMap<string, File>;
};

/** Поле-ловушка: настоящий человек его не видит и не заполняет. */
export const HONEYPOT_FIELD = 'hp';

function megabytes(bytes: number): string {
  return `${Math.round((bytes / 1_048_576) * 10) / 10} МБ`;
}

function tooLarge(maxBytes: number): ApiException {
  return new ApiException(
    'payload_too_large',
    `Данные слишком большие: допустимо до ${megabytes(maxBytes)}. Уменьшите фото и отправьте форму ещё раз`,
  );
}

const UNREADABLE = new ApiException(
  'validation_error',
  'Не получилось прочитать данные формы. Обновите страницу и заполните её заново',
);

function stringify(value: unknown): string | null {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

export async function readIntakeBody(request: Request, maxBytes: number): Promise<IntakeBody> {
  const declared = Number(request.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > maxBytes) throw tooLarge(maxBytes);

  const contentType = request.headers.get('content-type') ?? '';
  const fields: Record<string, string> = {};
  const files = new Map<string, File>();

  if (contentType.includes('application/json')) {
    /* Через text(), а не json(): chunked-запрос приходит без Content-Length,
       и проверка заголовка выше его не ловит — размер сверяется по факту,
       до разбора и раздачи строк дальше (аудит, BUGS). */
    const raw = await request.text().catch(() => {
      throw UNREADABLE;
    });
    if (raw.length > maxBytes) throw tooLarge(maxBytes);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw === '' ? '{}' : raw);
    } catch {
      throw UNREADABLE;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw UNREADABLE;
    for (const [key, value] of Object.entries(parsed)) {
      const text = stringify(value);
      if (text !== null) fields[key] = text;
    }
    return { fields, files };
  }

  const form = await request.formData().catch(() => {
    throw UNREADABLE;
  });

  /* Считаются и файлы, и строки: гигантское «текстовое поле» в chunked-запросе
     без Content-Length иначе проходило досмотр и резалось только Zod-ом много
     позже (аудит, BUGS). */
  let received = 0;
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') {
      received += value.length;
      if (received > maxBytes) throw tooLarge(maxBytes);
      fields[key] = value.trim();
      continue;
    }
    received += value.size;
    if (received > maxBytes) throw tooLarge(maxBytes);
    if (value.size > 0) files.set(key, value);
  }

  return { fields, files };
}

export function isHoneypotFilled(body: IntakeBody): boolean {
  const trap = body.fields[HONEYPOT_FIELD];
  return trap !== undefined && trap !== '';
}
