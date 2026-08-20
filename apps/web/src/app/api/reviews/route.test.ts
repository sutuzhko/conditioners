// @vitest-environment node
import { readFile, rm } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, dbMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-reviews',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
  dbMock: {
    review: { create: vi.fn() },
    notification: { createMany: vi.fn() },
    rateLimit: { upsert: vi.fn() },
  },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/db', () => ({ db: dbMock }));

const { POST } = await import('./route');

type Fields = Readonly<Record<string, string>>;

const SECRET_EXIF = 'GPS 54.196,37.618';

function jpegWithExif(): Buffer {
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

function reviewRequest(fields: Fields, file?: File): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (file !== undefined) form.append('photo', file);
  return new Request('https://example.test/api/reviews', { method: 'POST', body: form });
}

/** Браузер вообще не отправляет неотмеченный чекбокс — воспроизводим это буквально. */
function without(fields: Fields, key: string): Fields {
  const copy: Record<string, string> = { ...fields };
  delete copy[key];
  return copy;
}

const VALID: Fields = {
  name: 'Игорь П.',
  district: 'Привокзальный р-н',
  rating: '5',
  text: 'Приехали в срок, всё аккуратно, мусор убрали за собой.',
  consent: 'on',
};

async function readBody(response: Response): Promise<Record<string, unknown>> {
  const parsed: unknown = await response.json();
  return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
}

beforeEach(async () => {
  vi.clearAllMocks();
  await rm(testEnv.UPLOADS_DIR, { recursive: true, force: true });
  dbMock.rateLimit.upsert.mockResolvedValue({ hits: 1 });
  dbMock.notification.createMany.mockResolvedValue({ count: 1 });
  dbMock.review.create.mockImplementation(async ({ data }) => ({ id: 'rev-1', ...data }));
});

describe('POST /api/reviews', () => {
  it('принимает отзыв и оставляет его на модерации', async () => {
    const response = await POST(reviewRequest(VALID));

    expect(response.status).toBe(201);
    await expect(readBody(response)).resolves.toEqual({ id: 'rev-1' });
    expect(dbMock.review.create.mock.calls[0]?.[0].data).toMatchObject({
      name: 'Игорь П.',
      district: 'Привокзальный р-н',
      rating: 5,
      photo: null,
    });
    // статус не передаём: значение по умолчанию в схеме — PENDING
    expect(dbMock.review.create.mock.calls[0]?.[0].data.status).toBeUndefined();
  });

  it('ставит уведомление с кнопками модерации в очередь', async () => {
    await POST(reviewRequest(VALID));

    expect(dbMock.notification.createMany.mock.calls[0]?.[0].data).toEqual([
      expect.objectContaining({
        channel: 'email',
        kind: 'review',
        payload: expect.objectContaining({ kind: 'review', reviewId: 'rev-1', rating: 5 }),
      }),
    ]);
  });

  it('вырезает EXIF из приложенного фото и даёт файлу своё имя', async () => {
    const file = new File([new Uint8Array(jpegWithExif())], 'IMG_2024 квартира.jpg', {
      type: 'image/jpeg',
    });

    const response = await POST(reviewRequest(VALID, file));
    expect(response.status).toBe(201);

    const stored: unknown = dbMock.review.create.mock.calls[0]?.[0].data.photo;
    expect(typeof stored).toBe('string');
    const url = String(stored);
    expect(url.startsWith('/uploads/reviews/')).toBe(true);
    expect(url).not.toContain('IMG_2024');

    const saved = await readFile(`${testEnv.UPLOADS_DIR}/reviews/${url.split('/').pop()}`);
    expect(saved.toString('latin1')).not.toContain(SECRET_EXIF);
    expect(saved.subarray(0, 2).toString('hex')).toBe('ffd8');
  });

  it('не верит расширению: файл не изображение — 400', async () => {
    const file = new File([new Uint8Array(Buffer.from('<?php echo 1; ?>'))], 'photo.jpg', {
      type: 'image/jpeg',
    });

    const response = await POST(reviewRequest(VALID, file));
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({ code: 'validation_error', field: 'photo' });
    expect(dbMock.review.create).not.toHaveBeenCalled();
  });

  it('требует оценку от 1 до 5', async () => {
    const response = await POST(reviewRequest({ ...VALID, rating: '9' }));
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({ code: 'validation_error', field: 'rating' });
  });

  it('требует содержательный текст', async () => {
    const response = await POST(reviewRequest({ ...VALID, text: 'ок' }));
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({ code: 'validation_error', field: 'text' });
  });

  it('без согласия на обработку данных отвечает 400', async () => {
    const response = await POST(reviewRequest(without(VALID, 'consent')));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toMatchObject({ field: 'consent' });
    expect(dbMock.review.create).not.toHaveBeenCalled();
  });

  it('молча отбрасывает бота, заполнившего поле-ловушку', async () => {
    const response = await POST(reviewRequest({ ...VALID, hp: 'ссылка' }));

    expect(response.status).toBe(201);
    expect(dbMock.review.create).not.toHaveBeenCalled();
  });

  it('при превышении частоты по IP отвечает 429', async () => {
    dbMock.rateLimit.upsert.mockResolvedValue({ hits: 4 });

    const response = await POST(reviewRequest(VALID));

    expect(response.status).toBe(429);
    expect(dbMock.review.create).not.toHaveBeenCalled();
  });
});
