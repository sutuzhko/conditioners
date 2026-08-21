/** Данные для историй и тестов списка каталога. */
import type { CatalogRow } from './AdminCatalogList';

export const catalogRowsFixture: readonly CatalogRow[] = [
  {
    id: '1',
    name: 'Сплит-система 07',
    badge: '07',
    areaMax: 20,
    priceNum: 31900,
    salePrice: null,
    visible: true,
    sort: 0,
  },
  {
    id: '2',
    name: 'Сплит-система 09',
    badge: '09',
    areaMax: 27,
    priceNum: 38500,
    salePrice: 34900,
    visible: true,
    sort: 1,
  },
  {
    id: '3',
    name: 'Сплит-система 18',
    badge: '18',
    areaMax: 50,
    priceNum: 58700,
    salePrice: null,
    visible: false,
    sort: 2,
  },
];
