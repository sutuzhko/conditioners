// @vitest-environment node
import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-model-photos',
    // лимит намеренно крошечный: тест на 413 не должен собирать многомегабайтный буфер
    UPLOAD_MAX_BYTES: 1024,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/auth', () => ({ getAdminSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/repo/products', () => ({ findById: vi.fn(), addPhoto: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { getAdminSession, type AdminSession } from '@/server/auth';
import * as products from '@/server/repo/products';
import type { ProductDto } from '@/server/repo/products';
import { POST } from './route';

const session: AdminSession = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
};

const product: ProductDto = {
  id: 'p1',
  slug: 'split-sistema-09',
  badge: '09',
  name: 'Сплит-система 09',
  brand: null,
  sku: null,
  areaMax: 27,
  tag: null,
  priceNum: 38_500,
  salePrice: null,
  saleFrom: null,
  saleTo: null,
  saleLabel: null,
  link: null,
  visible: true,
  sort: 0,
  seoTitle: null,
  seoDescription: null,
  photos: [],
  specs: [{ k: 'Площадь', v: 'до 27 м²' }],
  currentPrice: 38_500,
  oldPrice: null,
  discountPercent: 0,
  saleActive: false,
};

/** Настоящая сигнатура JPEG: сегменты APP1 (EXIF) и SOS, как в живом снимке. */
function jpegBytes(): Buffer {
  const exif = Buffer.from('Exif  GPS 54.196,37.618', 'latin1');
  const length = Buffer.alloc(2);
  length.writeUInt16BE(exif.length + 2);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe1]),
    length,
    exif,
    Buffer.from([0xff, 0xda, 0x00, 0x08, 0x11, 0x22, 0x33, 0xff, 0xd9]),
  ]);
}

function photoRequest(file?: File, alt?: string): NextRequest {
  const form = new FormData();
  if (file !== undefined) form.append('photo', file);
  if (alt !== undefined) form.append('alt', alt);
  return new NextRequest(new URL('/api/admin/models/p1/photos', 'http://tulaklimat.localhost'), {
    method: 'POST',
    body: form,
  });
}

function context(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/** Каталог загрузок между тестами вычищается, поэтому «ещё не создан» — тоже «пусто». */
async function storedFiles(): Promise<string[]> {
  try {
    return await readdir(testEnv.UPLOADS_DIR);
  } catch {
    return [];
  }
}

beforeEach(async () => {
  vi.clearAllMocks();
  await rm(testEnv.UPLOADS_DIR, { recursive: true, force: true });
  vi.mocked(getAdminSession).mockResolvedValue(session);
  vi.mocked(products.findById).mockResolvedValue(product);
  vi.mocked(products.addPhoto).mockImplementation(async (productId, photo) => ({
    id: `${productId}-photo`,
    url: photo.url,
    alt: photo.alt ?? null,
    isMain: true,
    sort: 0,
  }));
});

describe('POST /api/admin/models/[id]/photos', () => {
  it('без сессии отвечает 401 и не подпускает файл к диску', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const file = new File([new Uint8Array(jpegBytes())], 'photo.jpg', { type: 'image/jpeg' });
    const response = await POST(photoRequest(file), context('p1'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'unauthorized' } });
    expect(products.findById).not.toHaveBeenCalled();
    await expect(storedFiles()).resolves.toEqual([]);
  });

  it('сохраняет фото под именем-uuid и отвечает 201 с карточкой фотографии', async () => {
    const file = new File([new Uint8Array(jpegBytes())], 'IMG_2024 витрина.jpg', {
      type: 'image/jpeg',
    });

    const response = await POST(photoRequest(file, '  Сплит-система на стене  '), context('p1'));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: 'p1-photo',
      url: expect.stringMatching(/^\/api\/media\/[0-9a-f-]{36}\.jpg$/),
      alt: 'Сплит-система на стене',
      isMain: true,
    });

    const files = await storedFiles();
    expect(files).toHaveLength(1);
    const name = files[0] ?? '';
    // имя выдал сервер: uuid + расширение по сигнатуре, а не то, что прислал клиент
    expect(name).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(name).not.toContain('IMG_2024');

    const saved = await readFile(join(testEnv.UPLOADS_DIR, name));
    expect(saved.subarray(0, 2).toString('hex')).toBe('ffd8');

    // в базу ушли адрес сохранённого файла и подпись без крайних пробелов
    const [savedId, savedPhoto] = vi.mocked(products.addPhoto).mock.calls[0] ?? [];
    expect(savedId).toBe('p1');
    expect(savedPhoto).toEqual({ url: `/api/media/${name}`, alt: 'Сплит-система на стене' });

    // витрина и сравнение живут на главной (ADR-049) — сбрасывается она
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  it('пустая подпись сохраняется как null, а не пустой строкой', async () => {
    const file = new File([new Uint8Array(jpegBytes())], 'photo.jpg', { type: 'image/jpeg' });

    const response = await POST(photoRequest(file, '   '), context('p1'));

    expect(response.status).toBe(201);
    expect(vi.mocked(products.addPhoto).mock.calls[0]?.[1].alt).toBeNull();
  });

  it('не верит расширению: текст под именем .jpg отклоняется без записи на диск', async () => {
    const file = new File([new Uint8Array(Buffer.from('<?php echo 1; ?>'))], 'photo.jpg', {
      type: 'image/jpeg',
    });

    const response = await POST(photoRequest(file), context('p1'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'validation_error' },
    });
    expect(products.addPhoto).not.toHaveBeenCalled();
    await expect(storedFiles()).resolves.toEqual([]);
  });

  it('файл больше лимита отклоняется с 413 до разбора содержимого', async () => {
    const oversized = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      Buffer.alloc(testEnv.UPLOAD_MAX_BYTES, 0x11),
    ]);
    const file = new File([new Uint8Array(oversized)], 'huge.jpg', { type: 'image/jpeg' });

    const response = await POST(photoRequest(file), context('p1'));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'payload_too_large' },
    });
    expect(products.addPhoto).not.toHaveBeenCalled();
    await expect(storedFiles()).resolves.toEqual([]);
  });

  it('несуществующая модель — 404, файл даже не читается', async () => {
    vi.mocked(products.findById).mockResolvedValue(null);

    const file = new File([new Uint8Array(jpegBytes())], 'photo.jpg', { type: 'image/jpeg' });
    const response = await POST(photoRequest(file), context('missing'));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'not_found' } });
    expect(products.addPhoto).not.toHaveBeenCalled();
    await expect(storedFiles()).resolves.toEqual([]);
  });

  it('форма без файла — 400 с указанием поля', async () => {
    const response = await POST(photoRequest(), context('p1'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'validation_error', field: 'photo' },
    });
    expect(products.addPhoto).not.toHaveBeenCalled();
  });

  it('упавшая запись в БД не оставляет файл сиротой на диске', async () => {
    vi.mocked(products.addPhoto).mockRejectedValue(new Error('база недоступна'));

    const file = new File([new Uint8Array(jpegBytes())], 'photo.jpg', { type: 'image/jpeg' });

    const response = await POST(photoRequest(file), context('p1'));

    expect(response.status).toBe(500);
    await expect(storedFiles()).resolves.toEqual([]);
  });

  it('несуществующая модель — 404 по-русски', async () => {
    vi.mocked(products.findById).mockResolvedValue(null);

    const response = await POST(photoRequest(), context('missing'));

    await expect(response.json()).resolves.toMatchObject({
      error: { message: 'Модель не найдена' },
    });
  });
});
