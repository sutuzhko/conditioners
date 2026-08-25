import { afterEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';

import { leadManagerContent as texts } from './content';
import { patchLead } from './lib';

describe('Заявка — отправка правки', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('успешная правка не несёт сообщения', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );

    await expect(patchLead('l1', { status: 'done' })).resolves.toEqual({ ok: true });
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

    await expect(patchLead('l1', { status: 'done' })).resolves.toEqual({
      ok: false,
      message: 'Неизвестный статус',
    });
  });

  it('истёкшая сессия объясняется, а не выдаётся за отказ сервера', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    await expect(patchLead('l1', { managerComment: null })).resolves.toEqual({
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

    await expect(patchLead('l1', { status: 'done' })).resolves.toEqual({
      ok: false,
      message: texts.networkError,
    });
  });
});
