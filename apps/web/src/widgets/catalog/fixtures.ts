import type { CatalogProduct } from './model';

/**
 * Фикстуры блока. Живут рядом с ним и служат двум целям сразу: ими питаются
 * stories (в Storybook базы нет и быть не может) и тесты. Они же документируют,
 * какие данные блок ждёт от страницы (docs/ORCHESTRATION.md).
 *
 * 🔴 Это выдуманные модели, а не реальный каталог: настоящие товары владелец
 * заводит в админке.
 */

/**
 * Момент, относительно которого считается скидка в историях и тестах.
 * Фиксированный: иначе снепшот на четырёх ширинах разъедется в день, когда
 * период скидки закончится.
 */
export const NOW = new Date('2026-08-20T09:00:00.000Z');

/**
 * Фото прямо в фикстуре: data-URI, чтобы истории не зависели ни от загруженных
 * файлов, ни от работающего `/api/media`. Настоящие снимки приходят из админки.
 */
const SAMPLE_PHOTO =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360">' +
      '<rect width="480" height="360" fill="#E2F4F8"/>' +
      '<rect x="70" y="120" width="340" height="90" rx="18" fill="#FFFFFF" stroke="#A5F3FC" stroke-width="4"/>' +
      '<rect x="100" y="215" width="280" height="10" rx="5" fill="#A5F3FC"/>' +
      '<rect x="130" y="240" width="220" height="8" rx="4" fill="#CFF2F8"/>' +
      '</svg>',
  );

function product(overrides: Partial<CatalogProduct> & Pick<CatalogProduct, 'id'>): CatalogProduct {
  return {
    slug: overrides.id,
    badge: '09',
    name: 'Сплит-система 09',
    areaMax: 25,
    tag: null,
    priceNum: 38_500,
    salePrice: null,
    saleFrom: null,
    saleTo: null,
    saleLabel: null,
    link: null,
    visible: true,
    photos: [],
    specs: [],
    ...overrides,
  };
}

function specs(pairs: readonly (readonly [string, string])[]): CatalogProduct['specs'] {
  return pairs.map(([k, v], sort) => ({ k, v, sort }));
}

/** Базовая модель: без фото, без скидки — то, как каталог выглядит на старте. */
export const plainProduct = product({
  id: 'split-07',
  badge: '07',
  name: 'Сплит-система 07',
  areaMax: 20,
  priceNum: 34_900,
  specs: specs([
    ['Компрессор', 'Инверторный'],
    ['Уровень шума', '21 дБ'],
    ['Обогрев до', '−15 °C'],
  ]),
});

/** Модель с фотографией и действующей скидкой — плашка, старая цена и срок. */
export const discountedProduct = product({
  id: 'split-09',
  badge: '09',
  name: 'Сплит-система 09',
  tag: 'тихая, для спальни',
  areaMax: 25,
  priceNum: 38_500,
  salePrice: 33_900,
  saleFrom: new Date('2026-07-31T21:00:00.000Z'),
  saleTo: new Date('2026-10-31T20:59:59.999Z'),
  photos: [{ id: 'photo-09', url: SAMPLE_PHOTO, alt: null, isMain: true, sort: 0 }],
  specs: specs([
    ['Компрессор', 'Инверторный'],
    ['Уровень шума', '19 дБ'],
    ['Обогрев до', '−20 °C'],
  ]),
});

/** Модель с характеристикой, которой нет ни у кого: таблица растёт на строку. */
export const uniqueSpecProduct = product({
  id: 'split-12',
  badge: '12',
  name: 'Сплит-система 12',
  areaMax: 35,
  priceNum: 45_200,
  link: 'https://example.com/split-12',
  specs: specs([
    ['Компрессор', 'Инверторный'],
    ['Wi-Fi управление', 'Есть'],
    ['Уровень шума', '23 дБ'],
  ]),
});

/** Скидка с подписью владельца вместо процента и без срока окончания. */
export const labelledSaleProduct = product({
  id: 'split-18',
  badge: '18',
  name: 'Сплит-система 18',
  areaMax: 50,
  priceNum: 61_800,
  salePrice: 56_400,
  saleLabel: 'Последняя в наличии',
  specs: specs([
    ['Компрессор', 'On/off'],
    ['Уровень шума', '27 дБ'],
  ]),
});

/** Скидка закончилась вчера: карточка обязана рисоваться как обычная. */
export const expiredSaleProduct = product({
  id: 'split-24',
  badge: '24',
  name: 'Сплит-система 24',
  areaMax: 70,
  priceNum: 74_500,
  salePrice: 69_900,
  saleTo: new Date('2026-08-18T20:59:59.999Z'),
  specs: specs([['Компрессор', 'Инверторный']]),
});

/** Скрытая модель: в витрину и в сравнение попадать не должна. */
export const hiddenProduct = product({
  id: 'split-hidden',
  name: 'Снятая с продажи',
  visible: false,
  specs: specs([['Секретная характеристика', 'Нет']]),
});

export const catalogFixture: readonly CatalogProduct[] = [
  plainProduct,
  discountedProduct,
  uniqueSpecProduct,
  labelledSaleProduct,
];

/**
 * Справочник характеристик для историй и тестов: две группы и одно поле вне
 * их — так видно и группировку, и то, что чужая характеристика не теряется.
 */
export const specDictionaryFixture = {
  groups: [
    {
      title: 'Основное',
      fields: [
        { k: 'Компрессор', unit: '' },
        { k: 'Обогрев до', unit: '°C' },
      ],
    },
    { title: 'Шум и воздух', fields: [{ k: 'Уровень шума', unit: 'дБ' }] },
  ],
};
