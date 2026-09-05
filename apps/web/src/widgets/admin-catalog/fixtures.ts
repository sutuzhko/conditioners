/** Данные для историй и тестов списка каталога. */
import type { CatalogRow } from './AdminCatalogList';

export const catalogRowsFixture: readonly CatalogRow[] = [
  {
    id: '1',
    name: 'Сплит-система 07, тихая серия',
    slug: 'split-07-tihaya',
    badge: '07',
    areaMax: 20,
    currentPrice: 31900,
    oldPrice: null,
    discountPercent: 0,
    saleTo: null,
    visible: true,
    featured: true,
    sort: 0,
    photo: null,
  },
  {
    id: '2',
    /* Модель со скидкой стоит рядом с моделью без неё намеренно: ровно на этой
       паре и меряется, что блок цены одной высоты (issue #354). */
    name: 'Сплит-система 09, инверторная',
    slug: 'split-09-invertornaya',
    badge: '09',
    areaMax: 27,
    currentPrice: 34900,
    oldPrice: 38500,
    discountPercent: 9,
    saleTo: '2026-09-10',
    visible: true,
    featured: true,
    sort: 1,
    photo: null,
  },
  {
    id: '3',
    name: 'Мульти-сплит на два блока',
    slug: 'multi-split-dva-bloka',
    badge: 'мульти',
    areaMax: 50,
    currentPrice: 58700,
    oldPrice: null,
    discountPercent: 0,
    saleTo: null,
    visible: false,
    featured: false,
    sort: 2,
    photo: null,
  },
];
