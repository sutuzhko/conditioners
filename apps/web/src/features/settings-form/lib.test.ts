import { describe, expect, it, vi, afterEach } from 'vitest';

import { putGroup, readPath, writePath } from './lib';

describe('Настройки — путь внутри группы', () => {
  it('читает вложенное значение', () => {
    expect(readPath({ messengerButtons: { telegram: true } }, 'messengerButtons.telegram')).toBe(
      true,
    );
  });

  it('отсутствующая ветка не ошибка: группу могли сохранить до появления поля', () => {
    expect(readPath({}, 'messengerButtons.telegram')).toBeUndefined();
    expect(readPath({ messengerButtons: null }, 'messengerButtons.telegram')).toBeUndefined();
  });

  it('запись возвращает копию, а не правит исходное значение', () => {
    const before = { email: 'a@b.c' };
    const after = writePath(before, 'email', 'x@y.z');

    expect(after).toEqual({ email: 'x@y.z' });
    expect(before).toEqual({ email: 'a@b.c' });
  });

  it('запись во вложенный путь создаёт недостающую ветку', () => {
    expect(writePath({}, 'callback.enabled', true)).toEqual({ callback: { enabled: true } });
  });

  it('запись во вложенный путь сохраняет соседей', () => {
    const value = { messengerButtons: { telegram: true, whatsapp: false } };

    expect(writePath(value, 'messengerButtons.whatsapp', true)).toEqual({
      messengerButtons: { telegram: true, whatsapp: true },
    });
  });
});

describe('Настройки — сохранение группы', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('200 — сохранено', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );

    await expect(putGroup('geo', { lat: 1, lng: 2 })).resolves.toEqual({ ok: true });
  });

  it('ошибка валидации показывается у своего поля', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: 'validation_error', message: 'Проверьте адрес почты', field: 'email' },
            }),
            { status: 422 },
          ),
      ),
    );

    const result = await putGroup('contacts', { email: 'не-почта' });

    // Сообщение Zod точнее любого нашего обобщения — показываем его как есть.
    expect(result).toEqual({
      ok: false,
      message: 'Проверьте адрес почты',
      fieldErrors: { email: 'Проверьте адрес почты' },
    });
  });

  it('истёкшая сессия объясняется отдельно', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    const result = await putGroup('geo', {});

    expect(result).toEqual({ ok: false, message: 'Сессия истекла. Войдите заново' });
  });

  it('нечитаемое тело ошибки не превращается в отказ разбора', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>502</html>', { status: 502 })),
    );

    const result = await putGroup('geo', {});

    expect(result.ok).toBe(false);
  });

  it('упавшая сеть сообщает, что изменения не сохранены', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const result = await putGroup('geo', {});

    expect(result).toEqual({
      ok: false,
      message: 'Не удалось связаться с сервером. Изменения не сохранены',
    });
  });
});
