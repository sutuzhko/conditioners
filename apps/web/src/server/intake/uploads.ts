import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { env } from '@/shared/config/env';
import { ApiException } from '@/server/http';
import { assertSupportedImage, extensionFor, stripImageMetadata } from './image';

/**
 * Приём фотографий из публичных форм.
 *
 * Имя файла генерирует сервер: оригинальное имя приходит от клиента и потому
 * не может участвовать в построении пути (docs/TECH_DECISIONS.md §9).
 */
export type UploadFolder = 'leads' | 'reviews';

/** Публичный префикс: файлы лежат в volume вне каталога приложения и раздаются по этому пути. */
export const UPLOADS_URL_PREFIX = '/uploads';

export type StoredImage = {
  readonly url: string;
  readonly path: string;
};

export async function storeImage(file: File, folder: UploadFolder): Promise<StoredImage> {
  if (file.size > env.UPLOAD_MAX_BYTES) {
    const limit = Math.round((env.UPLOAD_MAX_BYTES / 1_048_576) * 10) / 10;
    throw new ApiException(
      'payload_too_large',
      `Фото больше ${limit} МБ. Уменьшите снимок и приложите его ещё раз.`,
      'photo',
    );
  }

  const original = Buffer.from(await file.arrayBuffer());
  const format = assertSupportedImage(original);
  const cleaned = stripImageMetadata(original, format);

  const name = `${randomUUID()}${extensionFor(format)}`;
  const directory = join(env.UPLOADS_DIR, folder);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, name), cleaned);

  return { url: `${UPLOADS_URL_PREFIX}/${folder}/${name}`, path: join(directory, name) };
}

/**
 * Обратное преобразование для воркера: он читает файл с диска, чтобы приложить
 * его к письму или отправить в Telegram. Путь собирается только из URL,
 * который выдал сервер, и проверяется на выход за пределы каталога загрузок.
 */
export function resolveUploadPath(url: string): string | null {
  if (!url.startsWith(`${UPLOADS_URL_PREFIX}/`)) return null;
  const relative = normalize(url.slice(UPLOADS_URL_PREFIX.length + 1));
  if (relative.startsWith('..')) return null;
  return join(env.UPLOADS_DIR, relative);
}
