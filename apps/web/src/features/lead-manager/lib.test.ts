import { afterEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';

import { leadManagerContent as texts } from './content';
import { leadToClient, patchLead } from './lib';

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

describe('Заявка — «В клиенты»', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('новая карточка: отдаёт её идентификатор и признак заведения', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ client: { id: 'c1' }, created: true }), { status: 201 }),
      ),
    );

    await expect(leadToClient('l1')).resolves.toEqual({ ok: true, clientId: 'c1', created: true });
  });

  it('знакомый номер: карточка та же, признак заведения снят', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ client: { id: 'c9' }, created: false }), { status: 200 }),
      ),
    );

    await expect(leadToClient('l1')).resolves.toEqual({ ok: true, clientId: 'c9', created: false });
  });

  it('🔴 ответ не той формы не выдаётся за успех: он приходит снаружи', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ id: 'c1' }), { status: 201 })),
    );

    await expect(leadToClient('l1')).resolves.toEqual({
      ok: false,
      message: texts.serverError,
    });
  });

  it('отказ сервера объясняется его же словами', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: 'validation_error', message: 'В обращении нет телефона' },
            }),
            { status: 400 },
          ),
      ),
    );

    await expect(leadToClient('l1')).resolves.toEqual({
      ok: false,
      message: 'В обращении нет телефона',
    });
  });
});
