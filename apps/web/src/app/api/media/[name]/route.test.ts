// @vitest-environment node
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    // каталог загрузок — вложенный, чтобы рядом можно было положить «секрет»
    // и проверить, что «../» до него не дотягивается
    UPLOADS_DIR: '/tmp/tk-test-uploads-media/files',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
// маршрут тянет цепочку http → auth → repo → Prisma; сам клиент здесь не нужен
vi.mock('@/server/db', () => ({ db: {} }));

const { GET } = await import('./route');

const ROOT = '/tmp/tk-test-uploads-media';
const SECRET = 'секрет за пределами каталога загрузок';

// имена по маске генератора: 36 символов [0-9a-f-] и разрешённое расширение
const JPG_NAME = '0f8fad5a-d9cb-469f-a165-70867728950e.jpg';
const PNG_NAME = '0f8fad5a-d9cb-469f-a165-70867728950d.png';
const WEBP_NAME = '0f8fad5a-d9cb-469f-a165-70867728950c.webp';
const SVG_NAME = '0f8fad5a-d9cb-469f-a165-70867728950b.svg';
const MISSING_NAME = '0f8fad5a-d9cb-469f-a165-70867728950a.jpg';
const DIR_NAME = '0f8fad5a-d9cb-469f-a165-708677289509.jpg';
const PROTECTED_NAME = '0f8fad5a-d9cb-469f-a165-708677289508.jpg';

const PROTECTED_BYTES = Buffer.from('снимок комнаты клиента');

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0xff, 0xd9]);

function mediaRequest(name: string): [NextRequest, { params: Promise<{ name: string }> }] {
  return [
    new NextRequest(new URL(`/api/media/${encodeURIComponent(name)}`, 'https://example.test')),
    // params приходят из роутера уже раскодированными — передаём имя как есть
    { params: Promise.resolve({ name }) },
  ];
}

beforeEach(async () => {
  await rm(ROOT, { recursive: true, force: true });
  await mkdir(testEnv.UPLOADS_DIR, { recursive: true });
  await writeFile(join(ROOT, 'secret.txt'), SECRET);
  await writeFile(join(testEnv.UPLOADS_DIR, JPG_NAME), JPEG_BYTES);
  await writeFile(join(testEnv.UPLOADS_DIR, PNG_NAME), 'png-байты');
  await writeFile(join(testEnv.UPLOADS_DIR, WEBP_NAME), 'webp-байты');
  // «свой» файл с чужим расширением: маска обязана не подпустить его к отдаче
  await writeFile(join(testEnv.UPLOADS_DIR, SVG_NAME), '<svg onload="alert(1)"></svg>');
  await mkdir(join(testEnv.UPLOADS_DIR, DIR_NAME));
  // закрытое хранилище рядом: снимок комнаты клиента, который отдавать нельзя
  await mkdir(join(testEnv.UPLOADS_DIR, 'protected'), { recursive: true });
  await writeFile(join(testEnv.UPLOADS_DIR, 'protected', PROTECTED_NAME), PROTECTED_BYTES);
});

afterEach(async () => {
  await rm(ROOT, { recursive: true, force: true });
});

describe('GET /api/media/{name}', () => {
  it('отдаёт существующий файл с типом изображения и годовым кешем', async () => {
    const response = await GET(...mediaRequest(JPG_NAME));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    // имя уникально и содержимое по нему не меняется — кеш непробиваемый
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(response.headers.get('content-length')).toBe(String(JPEG_BYTES.length));

    const body = Buffer.from(await response.arrayBuffer());
    expect(body.equals(JPEG_BYTES)).toBe(true);
  });

  it('тип ответа определяется расширением из маски: png и webp', async () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      [PNG_NAME, 'image/png'],
      [WEBP_NAME, 'image/webp'],
    ];

    for (const [name, mime] of cases) {
      const response = await GET(...mediaRequest(name));
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe(mime);
    }
  });

  it('не выпускает за каталог загрузок: обходные имена получают 404', async () => {
    const hostile: readonly string[] = [
      '../secret.txt',
      '..%2Fsecret.txt',
      `nested/${JPG_NAME}`,
      'secret.txt',
    ];

    for (const name of hostile) {
      const response = await GET(...mediaRequest(name));
      expect(response.status).toBe(404);
      // содержимое соседнего файла не должно утечь ни при каком имени
      expect(await response.text()).not.toContain(SECRET);
    }
  });

  it('имя не по маске генератора — 404, даже когда файл лежит в каталоге', async () => {
    // svg в каталоге есть, но расширение вне маски: активное содержимое не отдаётся
    const svg = await GET(...mediaRequest(SVG_NAME));
    expect(svg.status).toBe(404);

    // маска строго строчная — «тот же» файл в верхнем регистре не проходит
    const upper = await GET(...mediaRequest(JPG_NAME.toUpperCase()));
    expect(upper.status).toBe(404);

    // человеческое имя файла сервер не генерирует — значит, не отдаёт
    const human = await GET(...mediaRequest('photo.jpg'));
    expect(human.status).toBe(404);
  });

  /**
   * 🔴 ADR-171: снимки клиента лежат в подкаталоге `protected` и публичной
   * отдачи не имеют вовсе. Проверка структурная, а не на честное слово: имя по
   * маске не содержит косой черты, а имя с чертой маску не проходит — значит
   * из этого маршрута до подкаталога не дотянуться ни одним запросом.
   */
  it('🔴 не отдаёт закрытые снимки клиента ни под каким именем', async () => {
    const attempts: readonly string[] = [
      PROTECTED_NAME,
      `protected/${PROTECTED_NAME}`,
      `protected%2F${PROTECTED_NAME}`,
      `./protected/${PROTECTED_NAME}`,
    ];

    for (const name of attempts) {
      const response = await GET(...mediaRequest(name));
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain(PROTECTED_BYTES.toString());
    }
  });

  it('валидное имя без файла на диске — 404 в конверте ошибок', async () => {
    const response = await GET(...mediaRequest(MISSING_NAME));
    const parsed: unknown = await response.json();

    expect(response.status).toBe(404);
    // конверт из docs/API.md §16, текст по-русски
    expect(parsed).toEqual({ error: { code: 'not_found', message: 'Файл не найден' } });
  });

  it('каталог, названный как файл, не отдаётся', async () => {
    const response = await GET(...mediaRequest(DIR_NAME));
    expect(response.status).toBe(404);
  });
});
