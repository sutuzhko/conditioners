import { OFFICE_PLACE_TYPE, type Product } from '@/entities/product/model';

import { pickerContent } from './content';

/**
 * Контракт первого экрана.
 *
 * 🔴 Блок ничего не знает о базе: модели и цифры приходят пропсами, запрос
 * делает страница (docs/ORCHESTRATION.md, волна 3).
 */

/**
 * Погода в городе для чипа первого экрана. Приходит пропсом: запрос к
 * внешнему сервису делает сервер страницы, блок только рисует результат.
 * Нет данных — нет и чипа: выдуманная температура здесь так же недопустима,
 * как выдуманная цена.
 */
export type HeroWeather = {
  /** Среднесуточная температура, °C. */
  readonly mean: number;
  /** Дневной максимум, °C. */
  readonly max: number;
};

/** Цифра полосы преимуществ: «1200+ установок в Туле». */
export type HeroStat = {
  /** Что стоит на месте числа: «1200», «3», «1–5», «до 5» (ADR-071). */
  readonly value: string;
  /** Хвост после числа: «+», « года», « день». Склонение задаёт владелец данных. */
  readonly suffix?: string | undefined;
  readonly label: string;
};

/**
 * Сколько цифр показывает полоса первого экрана.
 *
 * 🔴 Ограничение макета, а не данных (ADR-126). Владелец заводит столько цифр,
 * сколько считает нужным (ADR-052), но четвёртая не помещается в ряд и
 * переносится во вторую строку, ломая ритм экрана. Первый экран берёт первые
 * три; ничего из настроек при этом не удаляется — в админке об этом сказано
 * подписью.
 */
export const HERO_STATS_MAX = 3;

/**
 * Якорь карточки подбора: к ней ведёт единственный призыв первого экрана
 * (issue #253). Имя английское — как у всех адресуемых мест (инвариант 17).
 *
 * Идентификатор ставит `Hero`, а не сама карточка: где именно стоит подбор,
 * решает блок, а `HeroPicker` остаётся деталью, которую можно переставить.
 */
export const PICKER_ANCHOR_ID = 'picker';

/** Границы ползунка площади — из макета. */
export const AREA_MIN = 10;
export const AREA_MAX = 60;
export const AREA_DEFAULT = 25;

/**
 * Тип помещения. «Офис» берётся константой домена: по ней `pickByArea`
 * узнаёт, что нужен сдвиг на класс выше (docs/PROJECT.md §2.3).
 */
export const PLACE_TYPES = ['Квартира', 'Частный дом', OFFICE_PLACE_TYPE] as const;

export type PlaceType = (typeof PLACE_TYPES)[number];

/**
 * 🔴 Модель в том виде, в каком её читает подбор первого экрана, — и не
 * больше.
 *
 * Раньше сюда уезжал результат `listVisible()` целиком: все фотографии и все
 * характеристики каждой модели. `HeroPicker` клиентский, значит весь массив
 * сериализуется в flight-данные внутри HTML первого экрана — то есть ровно
 * там, где считается LCP. Использует он из этого семь полей, одну фотографию
 * и две характеристики; при справочнике из восьми групп (ADR-094) на модель
 * приходится под сорок пар, и почти ничего из них не читается никогда.
 *
 * Строка характеристик и главная фотография выбираются на сервере: это чистое
 * преобразование, и клиенту незачем получать исходные списки, чтобы свести их
 * к одной строке и одной картинке.
 */
export type PickerProduct = {
  readonly slug: string;
  readonly name: string;
  readonly badge: string;
  readonly tag: string | null;
  readonly areaMax: number;
  readonly link: string | null;
  readonly sort: number;
  readonly visible: boolean;
  /* Цены остаются полями, а не готовой строкой: скидку считает `getActivePrice`
     от переданного `now`, и подменять домен готовым числом здесь нельзя. */
  readonly priceNum: number;
  readonly salePrice: number | null;
  readonly saleFrom: Date | null;
  readonly saleTo: Date | null;
  readonly saleLabel: string | null;
  /** Готовая строка «2.6 кВт · до 27 м²»: собрана на сервере. */
  readonly specsLine: string;
  readonly photo: { readonly url: string; readonly alt: string | null } | null;
};

/** Сколько характеристик показывает строка под названием модели. */
const SPECS_IN_LINE = 2;

/**
 * Проекция модели для подбора: вызывается на сервере, на клиент уезжает уже
 * результат.
 *
 * Площадь в строке характеристик стоит последней и не дублируется: справочник
 * владельца часто содержит её отдельной парой, и без фильтра она печаталась бы
 * дважды.
 */
export function toPickerProduct(product: Product): PickerProduct {
  const area = pickerContent.areaUpTo(product.areaMax);
  const specs = product.specs
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((spec) => spec.v)
    .filter((value) => value !== area)
    .slice(0, SPECS_IN_LINE);

  const main = product.photos.find((photo) => photo.isMain) ?? product.photos[0];

  return {
    slug: product.slug,
    name: product.name,
    badge: product.badge,
    tag: product.tag,
    areaMax: product.areaMax,
    link: product.link,
    sort: product.sort,
    visible: product.visible,
    priceNum: product.priceNum,
    salePrice: product.salePrice,
    saleFrom: product.saleFrom,
    saleTo: product.saleTo,
    saleLabel: product.saleLabel,
    specsLine: [...specs, area].join(' · '),
    photo: main === undefined ? null : { url: main.url, alt: main.alt },
  };
}
