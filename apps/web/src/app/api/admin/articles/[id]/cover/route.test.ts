// @vitest-environment node
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-article-cover',
    // лимит намеренно крошечный: тест на 413 не должен собирать многомегабайтный буфер
    UPLOAD_MAX_BYTES: 1024,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: `isOwner` берём настоящий — раздел владельческий,
   и проверяется разграничение, а не сама функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

/* 🔴 Подмена репозитория команды нужна не маршруту, а разрыву цикла импортов:
   `auth` тянет `repo/admin-users`, тот — `http` ради `ApiException`, а `http` —
   обратно `auth`. На полпути этого круга `http` получает настоящий
   `getAdminSession` мимо подмены, и проверка доступа уходит в `cookies()` вне
   запроса. Без этой строки падают все проверки файла. */
vi.mock('@/server/repo/admin-users', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/repo/articles', () => ({ findById: vi.fn(), setCover: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { getAdminSession, type AdminSession } from '@/server/auth';
import * as articles from '@/server/repo/articles';
import type { ArticleDto } from '@/server/repo/articles';
import { POST } from './route';

const session: AdminSession = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
};

const article: ArticleDto = {
  id: 'a1',
  slug: 'kak-vybrat-kondicioner',
  title: 'Как выбрать кондиционер',
  category: 'Выбор',
  date: '2026-08-01T00:00:00.000Z',
  minutes: 7,
  cover: null,
  excerpt: 'Коротко о выборе модели под площадь комнаты.',
  published: true,
  updatedAt: '2026-08-01T00:00:00.000Z',
  body: 'Текст статьи',
  seoTitle: null,
  seoDescription: null,
};

const SECRET_EXIF = 'GPS 54.196,37.618';

/** Настоящая сигнатура JPEG: сегменты APP1 (EXIF) и SOS, как в живом снимке. */
function jpegBytes(): Buffer {
  const exif = Buffer.from(`Exif  ${SECRET_EXIF}`, 'latin1');
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

function coverRequest(file?: File, field = 'cover'): NextRequest {
  const form = new FormData();
  if (file !== undefined) form.append(field, file);
  return new NextRequest(new URL('/api/admin/articles/a1/cover', 'http://tulaklimat.localhost'), {
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
  vi.mocked(articles.findById).mockResolvedValue(article);
  vi.mocked(articles.setCover).mockImplementation(async (id, cover) => ({
    ...article,
    id,
    cover,
  }));
});

describe('POST /api/admin/articles/[id]/cover', () => {
  it('без сессии отвечает 401 и не подпускает файл к диску', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const file = new File([new Uint8Array(jpegBytes())], 'cover.jpg', { type: 'image/jpeg' });
    const response = await POST(coverRequest(file), context('a1'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'unauthorized' } });
    expect(articles.findById).not.toHaveBeenCalled();
    await expect(storedFiles()).resolves.toEqual([]);
  });

  it('сохраняет обложку под именем-uuid, без следов оригинального имени и EXIF', async () => {
    const file = new File([new Uint8Array(jpegBytes())], 'IMG_2024 обложка.jpg', {
      type: 'image/jpeg',
    });

    const response = await POST(coverRequest(file), context('a1'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cover: expect.stringMatching(/^\/api\/media\/[0-9a-f-]{36}\.jpg$/),
    });

    const files = await storedFiles();
    expect(files).toHaveLength(1);
    const name = files[0] ?? '';
    // имя выдал сервер: uuid + расширение по сигнатуре, а не то, что прислал клиент
    expect(name).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(name).not.toContain('IMG_2024');

    const saved = await readFile(join(testEnv.UPLOADS_DIR, name));
    expect(saved.subarray(0, 2).toString('hex')).toBe('ffd8');
    // 🔴 метаданные вырезаны: координаты из EXIF не должны пережить загрузку
    expect(saved.toString('latin1')).not.toContain(SECRET_EXIF);

    // в базу ушёл ровно тот адрес, под которым файл лёг на диск
    const [savedId, savedUrl] = vi.mocked(articles.setCover).mock.calls[0] ?? [];
    expect(savedId).toBe('a1');
    expect(savedUrl).toBe(`/api/media/${name}`);
  });

  it('сбрасывает кеш главной, листинга и самой статьи', async () => {
    const file = new File([new Uint8Array(jpegBytes())], 'cover.jpg', { type: 'image/jpeg' });

    await POST(coverRequest(file), context('a1'));

    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/knowledge');
    expect(revalidatePath).toHaveBeenCalledWith('/knowledge/kak-vybrat-kondicioner');
  });

  it('принимает файл и из поля photo — запасное имя поля из контракта', async () => {
    const file = new File([new Uint8Array(jpegBytes())], 'cover.jpg', { type: 'image/jpeg' });

    const response = await POST(coverRequest(file, 'photo'), context('a1'));

    expect(response.status).toBe(200);
    expect(articles.setCover).toHaveBeenCalled();
  });

  it('удаляет прежнюю обложку с диска после замены', async () => {
    const oldName = '00000000-0000-4000-8000-000000000000.jpg';
    await mkdir(testEnv.UPLOADS_DIR, { recursive: true });
    await writeFile(join(testEnv.UPLOADS_DIR, oldName), jpegBytes());
    vi.mocked(articles.findById).mockResolvedValue({
      ...article,
      cover: `/api/media/${oldName}`,
    });

    const file = new File([new Uint8Array(jpegBytes())], 'new-cover.jpg', { type: 'image/jpeg' });
    const response = await POST(coverRequest(file), context('a1'));

    expect(response.status).toBe(200);
    const files = await storedFiles();
    // старый файл ушёл, на диске осталась только новая обложка
    expect(files).toHaveLength(1);
    expect(files).not.toContain(oldName);
  });

  it('не верит расширению: текст под именем .jpg отклоняется без записи на диск', async () => {
    const file = new File([new Uint8Array(Buffer.from('<?php echo 1; ?>'))], 'cover.jpg', {
      type: 'image/jpeg',
    });

    const response = await POST(coverRequest(file), context('a1'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'validation_error' },
    });
    expect(articles.setCover).not.toHaveBeenCalled();
    await expect(storedFiles()).resolves.toEqual([]);
  });

  it('файл больше лимита отклоняется с 413 до разбора содержимого', async () => {
    const oversized = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      Buffer.alloc(testEnv.UPLOAD_MAX_BYTES, 0x11),
    ]);
    const file = new File([new Uint8Array(oversized)], 'huge.jpg', { type: 'image/jpeg' });

    const response = await POST(coverRequest(file), context('a1'));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'payload_too_large' },
    });
    expect(articles.setCover).not.toHaveBeenCalled();
    await expect(storedFiles()).resolves.toEqual([]);
  });

  it('несуществующая статья — 404, файл даже не читается', async () => {
    vi.mocked(articles.findById).mockResolvedValue(null);

    const file = new File([new Uint8Array(jpegBytes())], 'cover.jpg', { type: 'image/jpeg' });
    const response = await POST(coverRequest(file), context('missing'));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'not_found' } });
    expect(articles.setCover).not.toHaveBeenCalled();
    await expect(storedFiles()).resolves.toEqual([]);
  });

  it('форма без файла — 400 с указанием поля', async () => {
    const response = await POST(coverRequest(), context('a1'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'validation_error', field: 'cover' },
    });
    expect(articles.setCover).not.toHaveBeenCalled();
  });

  it('ошибка загрузки называет поле обложки, а не всегда photo', async () => {
    const file = new File([new Uint8Array(Buffer.from('<?php echo 1; ?>'))], 'cover.jpg', {
      type: 'image/jpeg',
    });

    const response = await POST(coverRequest(file), context('a1'));

    // клиент подсвечивает поле по имени из ответа: в форме обложки поля
    // `photo` нет, и подсветка не нашла бы ничего
    await expect(response.json()).resolves.toMatchObject({ error: { field: 'cover' } });
  });

  it('файл, присланный в поле photo, и в ошибке назовётся photo', async () => {
    const file = new File([new Uint8Array(Buffer.from('<?php echo 1; ?>'))], 'cover.jpg', {
      type: 'image/jpeg',
    });

    const response = await POST(coverRequest(file, 'photo'), context('a1'));

    await expect(response.json()).resolves.toMatchObject({ error: { field: 'photo' } });
  });

  it('упавшая запись в БД не оставляет файл сиротой на диске', async () => {
    vi.mocked(articles.setCover).mockRejectedValue(new Error('база недоступна'));

    const file = new File([new Uint8Array(jpegBytes())], 'cover.jpg', { type: 'image/jpeg' });

    const response = await POST(coverRequest(file), context('a1'));

    expect(response.status).toBe(500);
    await expect(storedFiles()).resolves.toEqual([]);
  });

  it('несуществующая статья — 404 по-русски', async () => {
    vi.mocked(articles.findById).mockResolvedValue(null);

    const response = await POST(coverRequest(), context('missing'));

    await expect(response.json()).resolves.toMatchObject({
      error: { message: 'Статья не найдена' },
    });
  });
});
