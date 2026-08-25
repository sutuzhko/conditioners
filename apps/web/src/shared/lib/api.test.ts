import { afterEach, describe, expect, it, vi } from 'vitest';

import { adminRequest, jsonInit } from './api';

const TEXTS = {
  network: 'Сеть недоступна',
  server: 'Сервер не принял',
  session: 'Войдите заново',
};

function respond(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('adminRequest', () => {
  it('успех отдаёт тело как есть — разбирает его схема вызывающей фичи', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respond(200, { id: 'a1' }))),
    );

    const result = await adminRequest('/api/admin/x', jsonInit('POST', { a: 1 }), TEXTS);

    expect(result).toEqual({ ok: true, payload: { id: 'a1' } });
  });

  it('🔴 401 — это про сессию, а не про форму: свой текст и признак unauthorized', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respond(401, { error: { code: 'unauthorized', message: 'x' } }))),
    );

    const result = await adminRequest('/api/admin/x', { method: 'DELETE' }, TEXTS);

    expect(result).toEqual({ ok: false, message: 'Войдите заново', unauthorized: true });
  });

  it('конверт ошибки сервера доносит текст и поле до формы', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          respond(400, {
            error: { code: 'validation_error', message: 'Не хватает имени', field: 'name' },
          }),
        ),
      ),
    );

    const result = await adminRequest('/api/admin/x', jsonInit('PUT', {}), TEXTS);

    expect(result).toEqual({ ok: false, message: 'Не хватает имени', field: 'name' });
  });

  it('ответ без валидного конверта не подсовывает мусор — берётся текст фичи', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('<html>gateway timeout</html>', { status: 502 }))),
    );

    const result = await adminRequest('/api/admin/x', { method: 'POST' }, TEXTS);

    expect(result).toEqual({ ok: false, message: 'Сервер не принял' });
  });

  it('обрыв сети — текст про сеть, а не исключение наружу', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );

    const result = await adminRequest('/api/admin/x', { method: 'POST' }, TEXTS);

    expect(result).toEqual({ ok: false, message: 'Сеть недоступна' });
  });
});

describe('jsonInit', () => {
  it('с телом — JSON-заголовок и сериализация, без тела — только метод', () => {
    expect(jsonInit('PATCH', { a: 1 })).toEqual({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
    });
    expect(jsonInit('DELETE')).toEqual({ method: 'DELETE' });
  });
});
