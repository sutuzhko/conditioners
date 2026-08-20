// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { detectImage, isSafeFilename, stripMetadata } from '@/server/uploads';

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

describe('определение типа по сигнатуре', () => {
  it('узнаёт JPEG, PNG и WebP', () => {
    expect(detectImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe('jpg');
    expect(detectImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))?.ext).toBe('png');
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

    const cleaned = stripMetadata(original, { mime: 'image/jpeg', ext: 'jpg' });

    expect(cleaned.includes(Buffer.from('GPS 54.19'))).toBe(false);
    // Картинка остаётся картинкой: сигнатура и сжатые данные на месте
    expect(cleaned.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    expect(cleaned.includes(Buffer.from([0xff, 0xda]))).toBe(true);
  });
});

describe('имя файла', () => {
  it('пропускает только сгенерированные имена', () => {
    expect(isSafeFilename('0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.jpg')).toBe(true);
    expect(isSafeFilename('../../etc/passwd')).toBe(false);
    expect(isSafeFilename('photo.jpg')).toBe(false);
    expect(isSafeFilename('0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.php')).toBe(false);
  });
});
