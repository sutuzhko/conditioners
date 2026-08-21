import { describe, expect, it } from 'vitest';

import { buildBreadcrumbListJsonLd } from './breadcrumbs';
import { SITE_URL } from './fixtures';

describe('BreadcrumbList', () => {
  it('нумерует звенья по порядку и делает адреса абсолютными', () => {
    const node = buildBreadcrumbListJsonLd({
      siteUrl: SITE_URL,
      items: [
        { name: 'Главная', path: '/' },
        { name: 'Каталог', path: '/catalog' },
        { name: 'Сплит-система 09' },
      ],
    });

    expect(node).toEqual({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Каталог', item: `${SITE_URL}/catalog` },
        { '@type': 'ListItem', position: 3, name: 'Сплит-система 09' },
      ],
    });
  });

  it('след из одного звена разметкой не становится: главная крошек не имеет', () => {
    expect(
      buildBreadcrumbListJsonLd({ siteUrl: SITE_URL, items: [{ name: 'Главная', path: '/' }] }),
    ).toBeNull();
    expect(buildBreadcrumbListJsonLd({ siteUrl: SITE_URL, items: [] })).toBeNull();
  });

  it('звено без подписи выбрасывается, а не выводится пустым', () => {
    const node = buildBreadcrumbListJsonLd({
      siteUrl: SITE_URL,
      items: [{ name: 'Главная', path: '/' }, { name: '  ' }, { name: 'Цены', path: '/prices' }],
    });

    expect(node?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Цены', item: `${SITE_URL}/prices` },
    ]);
  });
});
