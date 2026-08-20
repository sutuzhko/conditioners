/**
 * Загрузка изображений — docs/TECH_DECISIONS §9.
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
import { env } from '@/shared/config/env';
import { ApiException } from '@/server/http';

/**
 * Публичный префикс отдачи файлов. Не `/uploads`: этот путь попадает под
 * правило `uploads/` в .gitignore, и файл маршрута молча не добавился бы в git.
 */
export const MEDIA_URL_PREFIX = '/api/media';

export type ImageKind = { mime: string; ext: 'jpg' | 'png' | 'webp' };

const KINDS: readonly (ImageKind & { matches: (bytes: Uint8Array) => boolean })[] = [
  {
    mime: 'image/jpeg',
    ext: 'jpg',
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    ext: 'png',
    matches: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d,
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    matches: (b) =>
      String.fromCharCode(b[0] ?? 0, b[1] ?? 0, b[2] ?? 0, b[3] ?? 0) === 'RIFF' &&
      String.fromCharCode(b[8] ?? 0, b[9] ?? 0, b[10] ?? 0, b[11] ?? 0) === 'WEBP',
  },
];

export function detectImage(bytes: Uint8Array): ImageKind | null {
  const kind = KINDS.find((candidate) => candidate.matches(bytes));
  return kind === undefined ? null : { mime: kind.mime, ext: kind.ext };
}

/** JPEG: выбрасываются APP1…APP15 (там живут Exif, GPS и XMP) и комментарии. */
function stripJpeg(buffer: Buffer): Buffer {
  const parts: Buffer[] = [buffer.subarray(0, 2)];
  let offset = 2;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) return buffer;

    const marker = buffer[offset + 1] ?? 0;

    // SOS и EOI: дальше идут сжатые данные, разбирать их не нужно.
    if (marker === 0xda || marker === 0xd9) {
      parts.push(buffer.subarray(offset));
      return Buffer.concat(parts);
    }

    const length = buffer.readUInt16BE(offset + 2);
    const end = offset + 2 + length;
    if (end > buffer.length) return buffer;

    const isMetadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) parts.push(buffer.subarray(offset, end));

    offset = end;
  }

  return Buffer.concat(parts);
}

const PNG_METADATA = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);

function stripPng(buffer: Buffer): Buffer {
  const parts: Buffer[] = [buffer.subarray(0, 8)];
  let offset = 8;

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > buffer.length) return buffer;

    if (!PNG_METADATA.has(type)) parts.push(buffer.subarray(offset, end));

    offset = end;
    if (type === 'IEND') break;
  }

  return Buffer.concat(parts);
}

const WEBP_METADATA = new Set(['EXIF', 'XMP ']);

function stripWebp(buffer: Buffer): Buffer {
  const parts: Buffer[] = [];
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32LE(offset + 4);
    const padded = size + (size % 2);
    const type = buffer.toString('ascii', offset, offset + 4);
    const end = offset + 8 + padded;
    if (end > buffer.length) return buffer;

    if (!WEBP_METADATA.has(type)) parts.push(buffer.subarray(offset, end));

    offset = end;
  }

  const payload = Buffer.concat(parts);
  const header = Buffer.from(buffer.subarray(0, 12));
  header.writeUInt32LE(payload.length + 4, 4);

  return Buffer.concat([header, payload]);
}

export function stripMetadata(buffer: Buffer, kind: ImageKind): Buffer {
  if (kind.ext === 'jpg') return stripJpeg(buffer);
  if (kind.ext === 'png') return stripPng(buffer);
  return stripWebp(buffer);
}

export type StoredFile = { url: string; filename: string; mime: string };

/**
 * Сохраняет изображение из multipart-формы.
 * Имя файла генерируется: оригинальное имя приходит от пользователя и
 * доверять ему нельзя.
 */
export async function saveImage(file: File): Promise<StoredFile> {
  if (file.size === 0) {
    throw new ApiException('validation_error', 'Файл пустой', 'photo');
  }
  if (file.size > env.UPLOAD_MAX_BYTES) {
    const limitMb = Math.round(env.UPLOAD_MAX_BYTES / 1024 / 1024);
    throw new ApiException('payload_too_large', `Файл больше ${limitMb} МБ`, 'photo');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectImage(buffer);
  if (kind === null) {
    throw new ApiException('validation_error', 'Подойдёт изображение JPEG, PNG или WebP', 'photo');
  }

  const cleaned = stripMetadata(buffer, kind);
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
 * Удаляет файл вместе с записью о нём: иначе том постепенно наполняется
 * фотографиями удалённых карточек, а их никто уже не найдёт.
 */
export async function deleteStoredImage(url: string): Promise<void> {
  if (!url.startsWith(`${MEDIA_URL_PREFIX}/`)) return;

  const name = url.slice(MEDIA_URL_PREFIX.length + 1);
  if (!isSafeFilename(name)) return;

  await rm(join(env.UPLOADS_DIR, name), { force: true });
}
