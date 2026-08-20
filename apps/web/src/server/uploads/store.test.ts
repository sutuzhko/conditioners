// @vitest-environment node
import { readFile, rm } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-store',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));

const { detectImage, stripMetadata } = await import('@/server/uploads/image');
const { deleteStoredImage, isSafeFilename, mimeFor, resolveUploadPath, saveImage } =
  await import('@/server/uploads/store');
const { ApiException } = await import('@/server/http');

/** Минимальный валидный JPEG: SOI + APP1 с Exif + APP0 + SOS + EOI. */
function jpegWithExif(): Buffer {
  const exifPayload = Buffer.from('Exif\0\0GPS 54.19 37.61', 'latin1');
  const app1 = Buffer.concat([
    Buffer.from([0xff, 0xe1]),
    (() => {
      const length = Buffer.alloc(2);
      length.writeUInt16BE(exifPayload.length + 2);
      return length;
    })(),
    exifPayload,
  ]);
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]);
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]);

  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, app0, sos]);
}

function upload(bytes: Buffer, name = 'IMG_2024 квартира.jpg'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' });
}

beforeEach(async () => {
  await rm(testEnv.UPLOADS_DIR, { recursive: true, force: true });
});

describe('определение типа по сигнатуре', () => {
  it('узнаёт JPEG, PNG и WebP', () => {
    expect(detectImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe('jpg');
    expect(detectImage(Buffer.from('89504e470d0a1a0a', 'hex'))?.ext).toBe('png');
    expect(
      detectImage(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
      )?.ext,
    ).toBe('webp');
  });

  it('переименованный в .jpg скрипт изображением не считается', () => {
    expect(detectImage(new Uint8Array(Buffer.from('<?php echo 1; ?>')))).toBeNull();
  });
});

describe('метаданные вырезаются', () => {
  it('Exif с координатами не остаётся в сохранённом JPEG', () => {
    const original = jpegWithExif();
    expect(original.includes(Buffer.from('GPS 54.19'))).toBe(true);

    const cleaned = stripMetadata(original, 'jpeg');

    expect(cleaned.includes(Buffer.from('GPS 54.19'))).toBe(false);
    // Картинка остаётся картинкой: сигнатура и сжатые данные на месте
    expect(cleaned.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    expect(cleaned.includes(Buffer.from([0xff, 0xda]))).toBe(true);
  });
});

describe('сохранение файла', () => {
  it('даёт файлу своё имя и адрес в /api/media', async () => {
    const stored = await saveImage(upload(jpegWithExif()));

    expect(stored.url).toBe(`/api/media/${stored.filename}`);
    expect(stored.mime).toBe('image/jpeg');
    expect(stored.filename).not.toContain('IMG_2024');
    expect(isSafeFilename(stored.filename)).toBe(true);

    const saved = await readFile(`${testEnv.UPLOADS_DIR}/${stored.filename}`);
    expect(saved.toString('latin1')).not.toContain('GPS 54.19');
  });

  it('пустой файл и не-изображение на диск не попадают', async () => {
    await expect(saveImage(upload(Buffer.alloc(0)))).rejects.toBeInstanceOf(ApiException);
    await expect(saveImage(upload(Buffer.from('<?php echo 1; ?>')))).rejects.toBeInstanceOf(
      ApiException,
    );
  });

  it('файл больше разрешённого отклоняется до чтения содержимого', async () => {
    const huge = upload(Buffer.alloc(testEnv.UPLOAD_MAX_BYTES + 1));

    await expect(saveImage(huge)).rejects.toMatchObject({ code: 'payload_too_large' });
  });

  it('удаление карточки уносит файл с диска', async () => {
    const stored = await saveImage(upload(jpegWithExif()));

    await deleteStoredImage(stored.url);

    await expect(readFile(`${testEnv.UPLOADS_DIR}/${stored.filename}`)).rejects.toThrow();
  });
});

describe('имя файла', () => {
  it('пропускает только сгенерированные имена', () => {
    expect(isSafeFilename('0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.jpg')).toBe(true);
    expect(isSafeFilename('../../etc/passwd')).toBe(false);
    expect(isSafeFilename('photo.jpg')).toBe(false);
    expect(isSafeFilename('0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.php')).toBe(false);
  });

  it('тип для отдачи берётся из расширения, которое выдал сервер', () => {
    expect(mimeFor('0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.png')).toBe('image/png');
    expect(mimeFor('0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.webp')).toBe('image/webp');
    expect(mimeFor('0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.jpg')).toBe('image/jpeg');
  });
});

describe('путь к файлу для воркера', () => {
  it('собирается только из выданного нами адреса', () => {
    expect(resolveUploadPath('/api/media/0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.jpg')).toBe(
      `${testEnv.UPLOADS_DIR}/0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.jpg`,
    );
  });

  it('чужой адрес и попытка выйти из каталога не превращаются в путь', () => {
    expect(resolveUploadPath('/api/media/../../etc/passwd')).toBeNull();
    expect(resolveUploadPath('https://example.test/photo.jpg')).toBeNull();
    expect(resolveUploadPath('/uploads/leads/photo.jpg')).toBeNull();
  });
});
