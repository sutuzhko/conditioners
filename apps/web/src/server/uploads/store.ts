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

/**
 * Подкаталог для изображений, закрытых сессией. Имя такое же короткое, как
 * `orders` у документов наряда: оба лежат внутри тома загрузок и оба
 * недостижимы публичным маршрутом (docs/TECH_DECISIONS §9).
 */
const PROTECTED_SUBDIR = 'protected';

function protectedDir(): string {
  return join(env.UPLOADS_DIR, PROTECTED_SUBDIR);
}

/** Что кладётся в базу для закрытого изображения: имя файла, а не адрес. */
export type StoredImage = { filename: string; mime: string };

export type StoredFile = StoredImage & { url: string };

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
 * 🔴 Потолок разрешения на входе. Умолчание sharp — 268 Мп, и 5 МБ хорошо
 * сжатого файла при таком разрешении разворачиваются в гигабайты памяти уже
 * на публичном маршруте: заявку с фотографией принимает кто угодно.
 *
 * 50 Мп — это 8660×5773, вдвое больше любой камеры телефона; настоящий снимок
 * в этот предел укладывается с запасом, а «бомба» до него не доходит.
 */
const MAX_INPUT_PIXELS = 50_000_000;

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
  const resized = sharp(cleaned, { limitInputPixels: MAX_INPUT_PIXELS }).resize({
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
 * Приём файла: проверка, чистка, пережатие и запись под сгенерированным именем.
 *
 * Имя файла генерируется: оригинальное имя приходит от пользователя и
 * доверять ему нельзя — ни как имени на диске, ни как части URL.
 *
 * `field` — имя поля формы, из которого пришёл файл. Оно едет в ошибку, а не
 * подставляется по умолчанию: форма обложки статьи ждёт `cover`, форма
 * отзыва — `photo` и `avatar`, и клиент подсвечивает поле по этому имени.
 */
async function store(file: File, field: string, dir: string): Promise<StoredImage> {
  if (file.size === 0) {
    throw new ApiException('validation_error', 'Файл пустой', field);
  }
  if (file.size > env.UPLOAD_MAX_BYTES) {
    throw new ApiException(
      'payload_too_large',
      `Фото больше ${megabytes(env.UPLOAD_MAX_BYTES)}. Уменьшите снимок и приложите его ещё раз`,
      field,
    );
  }

  const original = Buffer.from(await file.arrayBuffer());
  const kind = assertSupportedImage(original, field);
  const cleaned = await shrink(stripMetadata(original, kind.format, field), kind);

  const filename = `${randomUUID()}.${kind.ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), cleaned);

  return { filename, mime: kind.mime };
}

/**
 * Сохраняет изображение, которое сайт показывает всем: фото модели, обложку
 * статьи, снимок при отзыве. Возвращает публичный адрес отдачи.
 */
export async function saveImage(file: File, field: string): Promise<StoredFile> {
  const stored = await store(file, field, env.UPLOADS_DIR);

  return { url: `${MEDIA_URL_PREFIX}/${stored.filename}`, ...stored };
}

/**
 * 🔴 Сохраняет изображение, которое видно только по сессии: интерьер квартиры
 * клиента при заявке и снимки наряда «до/после».
 *
 * Файл кладётся в отдельный подкаталог, а наружу отдаётся только имя. Публичный
 * `/api/media/{name}` собирает путь из `UPLOADS_DIR` и имени, в котором по
 * `isSafeFilename` не может быть косой черты, — то есть до этого подкаталога он
 * не дотягивается по построению, а не по недосмотру проверяющего (ADR-171).
 */
export async function saveProtectedImage(file: File, field: string): Promise<StoredImage> {
  return await store(file, field, protectedDir());
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
 * Путь к закрытому изображению по имени из базы. Имя проверяется той же
 * маской, что и у публичной отдачи: косой черты в нём быть не может, значит
 * выйти этим путём за подкаталог нельзя.
 */
export function resolveProtectedPath(filename: string): string | null {
  if (!isSafeFilename(filename)) return null;

  return join(protectedDir(), filename);
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

/** То же для закрытых изображений: на входе имя файла, а не адрес. */
export async function deleteProtectedImage(filename: string): Promise<void> {
  const path = resolveProtectedPath(filename);
  if (path === null) return;

  await rm(path, { force: true });
}
