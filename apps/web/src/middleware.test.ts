// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { middleware } from './middleware';

/**
 * Ворота админки. Middleware работает на edge и в базу не ходит — он видит
 * только **наличие** cookie, а не её действительность. Из этого следует
 * несимметричность, которую и стерегут проверки ниже: не пустить дальше по
 * отсутствию cookie можно, а увести с формы входа по её присутствию — нельзя.
 */
function request(pathname: string, cookie?: string): NextRequest {
  const url = new URL(pathname, 'https://tulaklimat.ru');

  return new NextRequest(url, {
    headers: cookie === undefined ? {} : { cookie: `session=${cookie}` },
  });
}

const location = (response: Response): string | null => response.headers.get('location');

/* Значение только из ASCII: заголовок Cookie другого не принимает. Подпись
   заведомо не сойдётся — здесь и проверяется, что middleware об этом не знает
   и знать не должен. */
const STALE_COOKIE = 'eyJzdGFsZSI6dHJ1ZX0.signature-from-another-secret';

describe('ворота админки', () => {
  it('без cookie уводит на вход и запоминает, куда шли', () => {
    const response = middleware(request('/admin/orders?tab=today'));

    expect(response.status).toBe(307);
    const target = new URL(location(response) ?? '');
    expect(target.pathname).toBe('/admin/login');
    expect(target.searchParams.get('next')).toBe('/admin/orders?tab=today');
  });

  it('без cookie запрос к API получает 401 в конверте контракта', async () => {
    const response = middleware(request('/api/admin/orders'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'unauthorized' },
    });
  });

  it('форма входа открывается без cookie', () => {
    expect(middleware(request('/admin/login')).status).toBe(200);
  });

  /**
   * 🔴 Проверка родилась из поломки: с истёкшей или подписанной другим
   * секретом cookie человек не мог дойти до формы входа вовсе. Middleware гнал
   * его с `/admin/login` на `/admin`, настоящая проверка сессии гнала обратно —
   * `ERR_TOO_MANY_REDIRECTS`, и починить это можно было только чисткой cookie
   * в браузере.
   *
   * Случай не выдуманный: так ломается вход после смены `SESSION_SECRET`, то
   * есть ровно тогда, когда секрет ротируют.
   */
  it('🔴 форма входа открывается и с cookie: её действительность здесь неизвестна', () => {
    const response = middleware(request('/admin/login', STALE_COOKIE));

    expect(response.status).toBe(200);
    expect(location(response)).toBeNull();
  });

  it('с cookie остальные страницы панели пропускаются дальше', () => {
    const response = middleware(request('/admin/orders', STALE_COOKIE));

    expect(response.status).toBe(200);
    expect(location(response)).toBeNull();
  });

  it('страницы панели отдают noindex и по прямой ссылке', () => {
    for (const path of ['/admin/login', '/admin/orders']) {
      expect(middleware(request(path, STALE_COOKIE)).headers.get('X-Robots-Tag')).toBe(
        'noindex, nofollow',
      );
    }
  });
});
