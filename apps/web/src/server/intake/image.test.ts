// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ApiException } from '@/server/http';
import { detectImageFormat, stripImageMetadata } from './image';

/** Минимальные, но структурно верные файлы: настоящие снимки в тесты класть незачем. */
function be16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value);
  return buffer;
}

function jpegWithExif(): Buffer {
  const exif = Buffer.from('Exif\u0000\u0000GPS 54.196,37.618', 'latin1');
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), be16(exif.length + 2), exif]);
  const comment = Buffer.from('фото из квартиры', 'utf-8');
  const com = Buffer.concat([Buffer.from([0xff, 0xfe]), be16(comment.length + 2), comment]);
  const quantization = Buffer.concat([
    Buffer.from([0xff, 0xdb]),
    be16(4),
    Buffer.from([0x01, 0x02]),
  ]);
  const scan = Buffer.from([0xff, 0xda, 0x00, 0x08, 0x11, 0x22, 0x33, 0xff, 0xd9]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, com, quantization, scan]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
}

function pngWithExif(): Buffer {
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', Buffer.alloc(13)),
    pngChunk('eXIf', Buffer.from('GPS 54.196,37.618', 'latin1')),
    pngChunk('tEXt', Buffer.from('Author\u0000Иван', 'utf-8')),
    pngChunk('IDAT', Buffer.from([0x78, 0x9c, 0x01])),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function riffChunk(type: string, data: Buffer): Buffer {
  const size = Buffer.alloc(4);
  size.writeUInt32LE(data.length);
  const padding = data.length % 2 === 0 ? Buffer.alloc(0) : Buffer.alloc(1);
  return Buffer.concat([Buffer.from(type, 'latin1'), size, data, padding]);
}

function webpWithExif(): Buffer {
  const vp8x = Buffer.alloc(10);
  // выставлены флаги EXIF и XMP — после чистки они должны погаснуть
  vp8x.writeUInt8(0x0c, 0);
  const body = Buffer.concat([
    riffChunk('VP8X', vp8x),
    riffChunk('VP8 ', Buffer.from([0x01, 0x02, 0x03, 0x04])),
    riffChunk('EXIF', Buffer.from('GPS 54.196,37.618', 'latin1')),
  ]);
  const size = Buffer.alloc(4);
  size.writeUInt32LE(body.length + 4);
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), size, Buffer.from('WEBP', 'latin1'), body]);
}

describe('определение формата по сигнатуре', () => {
  it('узнаёт jpeg, png и webp', () => {
    expect(detectImageFormat(jpegWithExif())).toBe('jpeg');
    expect(detectImageFormat(pngWithExif())).toBe('png');
    expect(detectImageFormat(webpWithExif())).toBe('webp');
  });

  it('не верит расширению: содержимое не изображение', () => {
    expect(detectImageFormat(Buffer.from('<?php echo 1; ?>', 'utf-8'))).toBeNull();
  });
});

describe('вырезание метаданных', () => {
  it('убирает EXIF и комментарий из jpeg, оставляя картинку', () => {
    const cleaned = stripImageMetadata(jpegWithExif(), 'jpeg');
    const text = cleaned.toString('latin1');

    expect(text).not.toContain('Exif');
    expect(text).not.toContain('GPS 54.196,37.618');
    expect(cleaned.subarray(0, 2).toString('hex')).toBe('ffd8');
    // сегмент таблицы квантования и сами данные снимка остались на месте
    expect(cleaned.includes(Buffer.from([0xff, 0xdb]))).toBe(true);
    expect(cleaned.includes(Buffer.from([0x11, 0x22, 0x33]))).toBe(true);
    expect(cleaned.subarray(-2).toString('hex')).toBe('ffd9');
  });

  it('убирает eXIf и tEXt из png, оставляя IHDR, IDAT и IEND', () => {
    const cleaned = stripImageMetadata(pngWithExif(), 'png');
    const text = cleaned.toString('latin1');

    expect(text).not.toContain('eXIf');
    expect(text).not.toContain('tEXt');
    expect(text).toContain('IHDR');
    expect(text).toContain('IDAT');
    expect(text.endsWith('IEND\u0000\u0000\u0000\u0000')).toBe(true);
  });

  it('убирает чанк EXIF из webp и гасит флаги в VP8X', () => {
    const cleaned = stripImageMetadata(webpWithExif(), 'webp');

    expect(cleaned.toString('latin1')).not.toContain('GPS 54.196,37.618');
    expect(cleaned.subarray(0, 4).toString('latin1')).toBe('RIFF');
    // длина RIFF пересчитана под укоротившееся содержимое
    expect(cleaned.readUInt32LE(4)).toBe(cleaned.length - 8);
    // байт флагов VP8X: биты EXIF (0x08) и XMP (0x04) сняты
    expect(cleaned.readUInt8(20) & 0x0c).toBe(0);
  });

  it('на битом файле отказывает понятной ошибкой, а не отдаёт его как есть', () => {
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from('мусор', 'utf-8')]);
    expect(() => stripImageMetadata(broken, 'jpeg')).toThrow(ApiException);
  });
});
