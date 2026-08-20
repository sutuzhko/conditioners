import { ApiError } from './http';

/**
 * Разбор загруженного изображения без сторонних библиотек.
 *
 * 🔴 Две задачи, обе из docs/TECH_DECISIONS.md §9:
 *  1. Тип определяется по сигнатуре файла, а не по расширению и не по
 *     заголовку от клиента — переименованный скрипт не должен попасть на диск.
 *  2. Из файла вырезаются все метаданные: снимок квартиры клиента с
 *     GPS-координатами в EXIF — это утечка персональных данных.
 */
export type ImageFormat = 'jpeg' | 'png' | 'webp';

const EXTENSIONS: Readonly<Record<ImageFormat, string>> = {
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
};

export function extensionFor(format: ImageFormat): string {
  return EXTENSIONS[format];
}

const BROKEN_IMAGE = new ApiError(
  400,
  'validation_error',
  'Не удалось прочитать фото. Приложите обычный снимок в JPEG, PNG или WebP.',
  'photo',
);

const WRONG_FORMAT = new ApiError(
  400,
  'validation_error',
  'Фото должно быть в формате JPEG, PNG или WebP.',
  'photo',
);

export function detectImageFormat(buffer: Buffer): ImageFormat | null {
  if (buffer.length >= 3 && buffer.readUInt8(0) === 0xff && buffer.readUInt8(1) === 0xd8) {
    return 'jpeg';
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/**
 * JPEG — цепочка сегментов. Выкидываем все APPn (там живут EXIF, XMP, IPTC)
 * и комментарии; APP0 JFIF оставляем — в нём только плотность пикселей.
 */
function stripJpeg(buffer: Buffer): Buffer {
  const parts: Buffer[] = [buffer.subarray(0, 2)];
  let pos = 2;

  while (pos + 1 < buffer.length) {
    if (buffer.readUInt8(pos) !== 0xff) throw BROKEN_IMAGE;
    const marker = buffer.readUInt8(pos + 1);

    // SOS и EOI: дальше идут сжатые данные, метаданных там нет
    if (marker === 0xda || marker === 0xd9) {
      parts.push(buffer.subarray(pos));
      return Buffer.concat(parts);
    }
    // маркеры без поля длины
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(buffer.subarray(pos, pos + 2));
      pos += 2;
      continue;
    }

    if (pos + 4 > buffer.length) throw BROKEN_IMAGE;
    const length = buffer.readUInt16BE(pos + 2);
    const end = pos + 2 + length;
    if (length < 2 || end > buffer.length) throw BROKEN_IMAGE;

    const isApp = marker >= 0xe0 && marker <= 0xef;
    const isComment = marker === 0xfe;
    const isJfif =
      marker === 0xe0 && buffer.subarray(pos + 4, pos + 8).toString('latin1') === 'JFIF';

    if (!isComment && (!isApp || isJfif)) parts.push(buffer.subarray(pos, end));
    pos = end;
  }

  throw BROKEN_IMAGE;
}

/** Чанки PNG, нужные для отрисовки. Всё остальное (eXIf, tEXt, iTXt, tIME…) вырезаем. */
const PNG_KEEP: ReadonlySet<string> = new Set([
  'IHDR',
  'PLTE',
  'IDAT',
  'IEND',
  'tRNS',
  'gAMA',
  'cHRM',
  'sRGB',
  'iCCP',
  'sBIT',
  'bKGD',
  'pHYs',
]);

function stripPng(buffer: Buffer): Buffer {
  const parts: Buffer[] = [buffer.subarray(0, 8)];
  let pos = 8;

  while (pos + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.subarray(pos + 4, pos + 8).toString('latin1');
    const end = pos + 12 + length;
    if (end > buffer.length) throw BROKEN_IMAGE;
    if (PNG_KEEP.has(type)) parts.push(buffer.subarray(pos, end));
    pos = end;
    if (type === 'IEND') return Buffer.concat(parts);
  }

  throw BROKEN_IMAGE;
}

/** Биты флагов в чанке VP8X: их снимаем вместе с удалением чанков EXIF и XMP. */
const VP8X_EXIF_FLAG = 0x08;
const VP8X_XMP_FLAG = 0x04;

function stripWebp(buffer: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let pos = 12;

  while (pos + 8 <= buffer.length) {
    const type = buffer.subarray(pos, pos + 4).toString('latin1');
    const size = buffer.readUInt32LE(pos + 4);
    // чанки RIFF выравниваются по чётной границе
    const end = pos + 8 + size + (size % 2);
    if (pos + 8 + size > buffer.length) throw BROKEN_IMAGE;

    if (type !== 'EXIF' && type !== 'XMP ') {
      const chunk = Buffer.from(buffer.subarray(pos, Math.min(end, buffer.length)));
      if (type === 'VP8X' && chunk.length >= 9) {
        chunk.writeUInt8(chunk.readUInt8(8) & ~(VP8X_EXIF_FLAG | VP8X_XMP_FLAG), 8);
      }
      chunks.push(chunk);
    }
    pos = end;
  }

  if (chunks.length === 0) throw BROKEN_IMAGE;

  const payload = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(payload.length + 4, 4);
  header.write('WEBP', 8, 'latin1');
  return Buffer.concat([header, payload]);
}

/** Возвращает изображение без единого блока метаданных. Формат при этом не меняется. */
export function stripImageMetadata(buffer: Buffer, format: ImageFormat): Buffer {
  if (format === 'jpeg') return stripJpeg(buffer);
  if (format === 'png') return stripPng(buffer);
  return stripWebp(buffer);
}

export function assertSupportedImage(buffer: Buffer): ImageFormat {
  const format = detectImageFormat(buffer);
  if (format === null) throw WRONG_FORMAT;
  return format;
}
