import { describe, expect, it } from 'vitest';

import { SITE_ROUTES, productPath, articlePath } from '@/shared/seo/routes';

import { ROUTES } from './revalidate';

/**
 * 🔴 Ревалидация бьёт по адресам, которых может не быть.
 *
 * Расхождение этой карты с картой сайта не видно ни в деве (там страница
 * пересобирается на каждый запрос), ни в типах (обе стороны — строки).
 * Проявляется оно только на проде и выглядит как «правки в админке не
 * появляются на сайте». Один раз так и случилось — после перехода на
 * английские адреса (ADR-042) копия здесь осталась русской.
 */
describe('Адреса ревалидации', () => {
  const known = new Set(SITE_ROUTES.map((route) => route.path));

  it.each(Object.entries(ROUTES))('%s → %s есть в карте сайта', (_key, path) => {
    expect(known).toContain(path);
  });

  it('динамические адреса строятся от тех же корней', () => {
    expect(productPath('split-sistema-09')).toBe(`${ROUTES.catalog}/split-sistema-09`);
    expect(articlePath('invertor-ili-onoff')).toBe(`${ROUTES.knowledge}/invertor-ili-onoff`);
  });

  it('карта покрывает все страницы, которые правятся из админки', () => {
    const revalidated = new Set(Object.values(ROUTES));

    for (const path of [
      '/catalog',
      '/prices',
      '/installation',
      '/service',
      '/reviews',
      '/knowledge',
    ]) {
      expect(revalidated).toContain(path);
    }
  });
});
