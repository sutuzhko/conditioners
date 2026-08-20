/**
 * Приём и хранение изображений — docs/TECH_DECISIONS §9.
 *
 * Файлы кладутся в примонтированный том вне каталога приложения, имя
 * генерирует сервер, тип определяется по сигнатуре, а не по расширению:
 * «photo.jpg» с PHP внутри не должен ни сохраниться, ни выполниться.
 *
 * 🔴 Метаданные вырезаются: снимок квартиры клиента с GPS-координатами —
 * утечка персональных данных.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { env } from '@/shared/config/env';
import { ApiException } from '@/server/http';
import { assertSupportedImage, stripMetadata, type ImageKind } from '@/server/uploads/image';

/**
 * Публичный префикс отдачи файлов. Не `/uploads`: этот путь попадает под
 * правило `uploads/` в .gitignore, и файл маршрута молча не добавился бы в git.
 */
export const MEDIA_URL_PREFIX = '/api/media';

export type StoredFile = { url: string; filename: string; mime: string };

/**
 * Длинная сторона сохраняемого изображения. Больше нигде на сайте не
 * показывается: карточка модели на десктопе — 600px, ретина удваивает.
 * Снимок с телефона весит несколько мегабайт, и без пережатия каждый такой
 * файл потом уходит клиенту целиком — это прямой удар по LCP и по трафику.
 */
const MAX_SIDE_PX = 1200;

/** Качество перекодировки: на фото монтажа разница с оригиналом не видна. */
const QUALITY = 82;

/**
 * Пережатие после чистки метаданных.
 *
 * 🔴 Порядок важен: sharp по умолчанию **не** переносит метаданные исходника
 * в результат, а `keepMetadata`/`withMetadata` мы сознательно не включаем —
 * вместе с ними в файл вернулись бы EXIF и GPS-координаты квартиры клиента.
 *
 * Файл, который sharp не смог прочитать, сохраняется очищенным оригиналом:
 * структуру мы уже проверили, а терять из-за перекодировки заявку с фото
 * дороже, чем положить на диск лишние мегабайты (инвариант 2).
 */
async function shrink(cleaned: Buffer, kind: ImageKind): Promise<Buffer> {
  const resized = sharp(cleaned).resize({
    width: MAX_SIDE_PX,
    height: MAX_SIDE_PX,
    fit: 'inside',
    // маленькое фото не растягиваем: апскейл добавит вес, но не детали
    withoutEnlargement: true,
  });

  try {
    if (kind.format === 'png') return await resized.png({ compressionLevel: 9 }).toBuffer();
    if (kind.format === 'webp') return await resized.webp({ quality: QUALITY }).toBuffer();
    return await resized.jpeg({ quality: QUALITY, progressive: true }).toBuffer();
  } catch (error) {
    console.error('Не удалось пережать изображение, сохраняем очищенный оригинал', error);
    return cleaned;
  }
}

function megabytes(bytes: number): string {
  return `${Math.round((bytes / 1_048_576) * 10) / 10} МБ`;
}

/**
 * Сохраняет изображение из формы.
 *
 * Имя файла генерируется: оригинальное имя приходит от пользователя и
 * доверять ему нельзя — ни как имени на диске, ни как части URL.
 */
export async function saveImage(file: File): Promise<StoredFile> {
  if (file.size === 0) {
    throw new ApiException('validation_error', 'Файл пустой', 'photo');
  }
  if (file.size > env.UPLOAD_MAX_BYTES) {
    throw new ApiException(
      'payload_too_large',
      `Фото больше ${megabytes(env.UPLOAD_MAX_BYTES)}. Уменьшите снимок и приложите его ещё раз`,
      'photo',
    );
  }

  const original = Buffer.from(await file.arrayBuffer());
  const kind = assertSupportedImage(original);
  const cleaned = await shrink(stripMetadata(original, kind.format), kind);

  const filename = `${randomUUID()}.${kind.ext}`;
  await mkdir(env.UPLOADS_DIR, { recursive: true });
  await writeFile(join(env.UPLOADS_DIR, filename), cleaned);

  return { url: `${MEDIA_URL_PREFIX}/${filename}`, filename, mime: kind.mime };
}

/** Имя файла всегда сгенерировано нами — всё остальное к диску не подпускаем. */
export function isSafeFilename(name: string): boolean {
  return /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name);
}

export function mimeFor(name: string): string {
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Обратное преобразование для воркера: он читает файл с диска, чтобы приложить
 * его к письму или отправить в Telegram. Путь собирается только из URL,
 * который выдал сервер, поэтому выхода за пределы каталога загрузок быть не может.
 */
export function resolveUploadPath(url: string): string | null {
  if (!url.startsWith(`${MEDIA_URL_PREFIX}/`)) return null;

  const name = url.slice(MEDIA_URL_PREFIX.length + 1);
  if (!isSafeFilename(name)) return null;

  return join(env.UPLOADS_DIR, name);
}

/**
 * Удаляет файл вместе с записью о нём: иначе том постепенно наполняется
 * фотографиями удалённых карточек, а их никто уже не найдёт.
 */
export async function deleteStoredImage(url: string): Promise<void> {
  const path = resolveUploadPath(url);
  if (path === null) return;

  await rm(path, { force: true });
}
