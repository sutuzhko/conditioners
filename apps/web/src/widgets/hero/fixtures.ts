import type { Product, ProductSpec } from '@/entities/product/model';

import type { HeroStat } from './model';

/**
 * Фикстуры блока: они же документируют, какие данные первый экран ждёт от
 * страницы (docs/ORCHESTRATION.md, волна 3). В Storybook базы нет, а блок
 * обязан рисоваться — значит данные приходят отсюда.
 *
 * Названия и цены взяты из сидов прототипа; настоящий каталог приходит из БД.
 */
type Draft = {
  readonly badge: string;
  readonly name: string;
  readonly areaMax: number;
  readonly tag: string;
  readonly priceNum: number;
  readonly specs: ProductSpec[];
};

function product(draft: Draft, sort: number): Product {
  return {
    id: `m${draft.badge}`,
    slug: `split-sistema-${draft.badge}`,
    badge: draft.badge,
    name: draft.name,
    brand: null,
    sku: null,
    // подбор по площади выбирает из всего, что в продаже, а не из витрины
    featured: false,
    areaMax: draft.areaMax,
    tag: draft.tag,
    priceNum: draft.priceNum,
    salePrice: null,
    saleFrom: null,
    saleTo: null,
    saleLabel: null,
    link: null,
    visible: true,
    sort,
    seoTitle: null,
    seoDescription: null,
    photos: [],
    specs: draft.specs,
  };
}

const specs = (noise: string, power: string): ProductSpec[] => [
  { k: 'Уровень шума', v: noise, sort: 0 },
  { k: 'Потребление', v: power, sort: 1 },
];

export const heroModels: readonly Product[] = [
  product(
    {
      badge: '07',
      name: 'Сплит-система 07',
      areaMax: 20,
      tag: 'тихая, для спальни',
      priceNum: 31900,
      specs: specs('19 дБ', '0.6 кВт'),
    },
    0,
  ),
  product(
    {
      badge: '09',
      name: 'Сплит-система 09',
      areaMax: 27,
      tag: 'инвертор',
      priceNum: 38500,
      specs: specs('21 дБ', '0.7 кВт'),
    },
    1,
  ),
  product(
    {
      badge: '12',
      name: 'Сплит-система 12',
      areaMax: 35,
      tag: 'инвертор',
      priceNum: 44900,
      specs: specs('22 дБ', '0.85 кВт'),
    },
    2,
  ),
  product(
    {
      badge: '18',
      name: 'Сплит-система 18',
      areaMax: 50,
      tag: 'для дома и офиса',
      priceNum: 58700,
      specs: specs('24 дБ', '1.3 кВт'),
    },
    3,
  ),
];

/** Одна модель: подбор возвращает её при любой площади. */
export const singleModel: readonly Product[] = heroModels.slice(1, 2);

/** Момент, относительно которого считается скидка в историях и тестах. */
export const saleNow = new Date('2026-07-15T09:00:00.000Z');

/** Модель со скидкой: перечёркнутая цена настоящая, процент вычисляется. */
export const discountedModels: readonly Product[] = heroModels.map((item) =>
  item.badge === '09'
    ? {
        ...item,
        salePrice: 34900,
        saleFrom: new Date('2026-07-01T00:00:00.000Z'),
        saleTo: new Date('2026-07-31T00:00:00.000Z'),
      }
    : item,
);

/** Цифры полосы преимуществ приходят из настроек компании, а не из кода. */
export const heroStats: readonly HeroStat[] = [
  { value: '1200', suffix: '+', label: 'установок в Туле' },
  { value: '3', suffix: ' года', label: 'гарантия на монтаж' },
  { value: '1', suffix: ' день', label: 'от заявки до запуска' },
];

/**
 * Владелец завёл четыре цифры — предел настроек (ADR-052). Первый экран
 * показывает первые три: четвёртая переносится во вторую строку и ломает ритм
 * экрана (ADR-126). Из настроек при этом не пропадает ничего.
 */
export const heroStatsFour: readonly HeroStat[] = [
  ...heroStats,
  { value: '15', suffix: ' минут', label: 'среднее время ответа' },
];

/**
 * Текст капсулы задаёт владелец из админки, и длину его задаёт он же. Здесь —
 * строка, на которой капсула ломалась: перечисление городов области не
 * помещалось в неё (ADR-126). Список уехал в контакты, но плашка обязана
 * пережить и следующий длинный текст.
 */
export const longNote = 'Тула и область — выезд в день обращения, замер и расчёт сметы бесплатно';
