import { afterEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';

import { reviewModerationContent as texts } from './content';
import { reviewApi } from './lib';

describe('Модерация — запросы к серверу', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('успешное действие не несёт сообщения', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );

    await expect(reviewApi.setStatus('r1', { status: 'approved' })).resolves.toEqual({ ok: true });
  });

  it('текст отказа сервера показывается как есть', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { code: 'validation_error', message: 'Неизвестный статус' } }),
            { status: 422 },
          ),
      ),
    );

    await expect(reviewApi.setStatus('r1', { status: 'approved' })).resolves.toEqual({
      ok: false,
      message: 'Неизвестный статус',
    });
  });

  it('истёкшая сессия объясняется, а не выдаётся за отказ сервера', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    await expect(reviewApi.setStatus('r1', { status: 'approved' })).resolves.toEqual({
      ok: false,
      message: ADMIN_API_TEXTS.session,
    });

    // удаление ходит другим маршрутом, но про сессию говорит теми же словами
    await expect(reviewApi.remove('r1')).resolves.toEqual({
      ok: false,
      message: ADMIN_API_TEXTS.session,
    });
  });

  it('упавшая сеть сообщает, что изменения не сохранены', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    await expect(reviewApi.remove('r1')).resolves.toEqual({
      ok: false,
      message: texts.networkError,
    });
  });
});
