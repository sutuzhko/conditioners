import { describe, expect, it, vi, afterEach } from 'vitest';

import { adminLoginContent as texts } from './content';
import { emptyLoginValues, postLogin, safeRedirectTo, validateLoginValues } from './lib';

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

describe('Вход в админку — адрес возврата', () => {
  it('внутренний путь проходит как есть', () => {
    expect(safeRedirectTo('/admin/leads')).toBe('/admin/leads');
    expect(safeRedirectTo('/admin/orders?tab=new')).toBe('/admin/orders?tab=new');
  });

  it('запрос и якорь доезжают целиком: адрес возврата — это весь адрес', () => {
    expect(safeRedirectTo('/admin/leads?status=new#top')).toBe('/admin/leads?status=new#top');
  });

  it('🔴 «//чужой-сайт» браузер считает абсолютным адресом — не пропускаем', () => {
    expect(safeRedirectTo('//evil.example')).toBe('/admin');
    expect(safeRedirectTo('//evil.example/admin')).toBe('/admin');
  });

  it('🔴 обратный слэш равносилен прямому: «/\\чужой-сайт» уводит с сайта', () => {
    expect(new URL('/\\evil.example', 'https://site.ru').host).toBe('evil.example');

    expect(safeRedirectTo('/\\evil.example')).toBe('/admin');
    expect(safeRedirectTo('/\\/evil.example')).toBe('/admin');
    expect(safeRedirectTo('/\\evil.example/admin')).toBe('/admin');
  });

  /* 🔴 Пробельные управляющие символы парсер выбрасывает до разбора, поэтому
     «/⇥/злодей.example» превращается в «//злодей.example». Проверка строки
     этого не видит — отсюда и разбор парсером. */
  it.each([
    ['табуляция', '/\t/evil.example'],
    ['перевод строки', '/\n/evil.example'],
    ['возврат каретки', '/\r/evil.example'],
  ])('🔴 %s внутри пути собирает адрес, относительный протоколу', (_name, next) => {
    expect(new URL(next, 'https://site.ru').host).toBe('evil.example');

    expect(safeRedirectTo(next)).toBe('/admin');
  });

  it('одиночная табуляция чужого адреса не даёт — и путь остаётся своим', () => {
    expect(safeRedirectTo('/\tevil.example')).toBe('/evil.example');
  });

  it('кодированный обратный слэш остаётся частью пути, а не вторым слэшем', () => {
    expect(safeRedirectTo('/%5Cevil.example')).toBe('/%5Cevil.example');
  });

  it('внешний адрес и пустое значение уводят на свой раздел', () => {
    expect(safeRedirectTo('https://evil.example')).toBe('/admin');
    expect(safeRedirectTo('http://evil.example/admin')).toBe('/admin');
    expect(safeRedirectTo('')).toBe('/admin');
    expect(safeRedirectTo('/')).toBe('/admin');
    expect(safeRedirectTo(undefined)).toBe('/admin');
  });

  /* Путь без ведущего слэша парсер приводит к своему корню — с сайта это не
     уводит, поэтому и отбрасывать его незачем: наружу уходит уже нормализованный
     адрес, а не сырая строка запроса. */
  it('относительный путь нормализуется, а не отбрасывается', () => {
    expect(safeRedirectTo('admin/leads')).toBe('/admin/leads');
    expect(safeRedirectTo('/admin/./orders/../leads')).toBe('/admin/leads');
  });
});
