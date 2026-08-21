import { describe, expect, it } from 'vitest';

import { SITE_ROUTES, articlePath } from '@/shared/seo/routes';

import { ROUTES } from './revalidate';

/**
 * 🔴 Ревалидация бьёт по адресам, которых может не быть.
 *
 * Расхождение этой карты с картой сайта не видно ни в деве (там страница
 * пересобирается на каждый запрос), ни в типах (обе стороны — строки).
 * Проявляется оно только на проде и выглядит как «правки в админке не
 * появляются на сайте». Так уже было дважды: после перехода на английские
 * адреса (ADR-042) и после удаления кластера (ADR-049) — оба раза карта
 * оставалась со старыми адресами.
 */
describe('Адреса ревалидации', () => {
  const known = new Set(SITE_ROUTES.map((route) => route.path));

  it.each(Object.entries(ROUTES))('%s → %s есть в карте сайта', (_key, path) => {
    expect(known).toContain(path);
  });

  it('динамические адреса строятся от того же корня', () => {
    expect(articlePath('invertor-ili-onoff')).toBe(`${ROUTES.knowledge}/invertor-ili-onoff`);
  });

  it('главная сбрасывается: после ADR-049 разделы — её секции', () => {
    expect(Object.values(ROUTES)).toContain('/');
  });
});
