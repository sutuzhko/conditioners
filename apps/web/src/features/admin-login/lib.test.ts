import { describe, expect, it, vi, afterEach } from 'vitest';

import { adminLoginContent as texts } from './content';
import { emptyLoginValues, postLogin, validateLoginValues } from './lib';

describe('Вход в админку — проверка полей', () => {
  it('пустая форма даёт ошибку у обоих полей', () => {
    expect(validateLoginValues(emptyLoginValues)).toEqual({
      login: 'Введите логин',
      password: 'Введите пароль',
    });
  });

  it('пробелы вокруг логина не считаются заполнением', () => {
    const errors = validateLoginValues({ login: '   ', password: 'секрет' });

    expect(errors.login).toBe('Введите логин');
    expect(errors.password).toBeUndefined();
  });

  it('заполненная форма проходит', () => {
    expect(validateLoginValues({ login: 'admin', password: 'секрет' })).toEqual({});
  });
});

describe('Вход в админку — разбор ответа сервера', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('204 — вход выполнен', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    );

    await expect(postLogin({ login: 'admin', password: 'секрет' })).resolves.toEqual({ ok: true });
  });

  it('401 отвечает обобщённо: угадан ли логин — не сообщаем', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    const result = await postLogin({ login: 'admin', password: 'неверный' });

    expect(result).toEqual({ ok: false, message: texts.failed });
  });

  it('429 сообщает, через сколько можно повторить', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 429, headers: { 'Retry-After': '300' } })),
    );

    const result = await postLogin({ login: 'admin', password: 'секрет' });

    expect(result).toEqual({
      ok: false,
      message: texts.rateLimited(300),
      retryAfterSec: 300,
    });
  });

  it('упавшая сеть отличается от неверного пароля', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const result = await postLogin({ login: 'admin', password: 'секрет' });

    expect(result).toEqual({ ok: false, message: texts.network });
    expect(texts.network).not.toBe(texts.failed);
  });
});
