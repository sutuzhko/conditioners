import { afterEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';

import { productPhotosContent as texts } from './content';
import { photoApi } from './lib';

const api = photoApi('m1');
const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });

describe('Фотографии — запросы', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('201 отдаёт готовую запись фотографии', async () => {
    const photo = { id: 'p1', url: '/api/media/p1.webp', alt: null, isMain: true, sort: 0 };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(photo), { status: 201 })),
    );

    await expect(api.upload(file)).resolves.toEqual({ ok: true, photo });
  });

  it('ответ без записи фотографии — отказ, а не сломанная карточка', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 201 })),
    );

    await expect(api.upload(file)).resolves.toEqual({ ok: false, message: texts.serverError });
  });

  it('сообщение сервера доносится как есть', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: 'validation_error', message: 'Файл слишком большой' },
            }),
            { status: 422 },
          ),
      ),
    );

    await expect(api.upload(file)).resolves.toEqual({
      ok: false,
      message: 'Файл слишком большой',
    });
  });

  it('истёкшая сессия объясняется общим текстом панели: своего у фичи нет', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    await expect(api.remove('p1')).resolves.toEqual({
      ok: false,
      message: ADMIN_API_TEXTS.session,
    });
  });

  it('упавшая сеть сообщает, что фотография не загружена', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    await expect(api.patch('p1', { isMain: true })).resolves.toEqual({
      ok: false,
      message: texts.networkError,
    });
  });
});
