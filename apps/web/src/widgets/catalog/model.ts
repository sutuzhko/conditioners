import type { ButtonLinkHref } from '@/shared/ui';
import type { CatalogFilter, CatalogQuery } from '@/entities/product/lib/catalogQuery';
import type { Product, ProductPhoto } from '@/entities/product/model';

import { activeFilterLabel } from './content';

/**
 * Что каталогу нужно от товара.
 *
 * Не весь `Product`: `seoTitle`/`seoDescription` читает страница модели, а не
 * витрина. Тип собран через `Pick`, как `SalePricing` и `ComparableProduct` в
 * домене, — тогда фикстуре в Storybook не приходится выдумывать поля, которые
 * блок всё равно не рисует.
 */
export type CatalogProduct = Pick<
  Product,
  | 'id'
  | 'slug'
  | 'badge'
  | 'name'
  | 'areaMax'
  | 'tag'
  | 'priceNum'
  | 'salePrice'
  | 'saleFrom'
  | 'saleTo'
  | 'saleLabel'
  | 'link'
  | 'visible'
  // порядок владельца: по нему идёт выдача каталога и собираются значения
  // фильтров — блоку он нужен затем же, зачем и странице (ADR-109)
  | 'sort'
  | 'photos'
  | 'specs'
>;

/**
 * Якорь строки сравнения на странице каталога.
 *
 * Отметка «Сравнить» ведёт именно сюда: клик по карточке в середине списка —
 * это переход по ссылке, и без якоря человек оказывался бы в начале страницы,
 * не увидев, что его выбор куда-то попал. По-английски, как всё адресуемое
 * (инвариант 17).
 *
 * 🔴 Сама таблица уехала на `/compare` (ADR-121), и якорь теперь приземляет
 * на строку «отмечено N · Сравнить · Очистить» — она стоит вплотную над
 * сеткой, поэтому сразу под ней виден товар, а не развернувшаяся таблица.
 */
export const COMPARE_ANCHOR = 'compare';

/**
 * Выбранное в подборе — списком, пригодным для показа чипами.
 *
 * 🔴 Существует затем, что подбор сворачивается (ADR-121): свёрнутая панель
 * оставляла бы человека наедине с тремя моделями и без объяснения, куда
 * делись остальные. Чипы отвечают на этот вопрос рядом со счётчиком
 * найденного и в свёрнутом состоянии тоже.
 *
 * Порядок групп повторяет порядок самого подбора — класс, площадь,
 * предложения: чип и группа, из которой он взялся, обязаны читаться как одно.
 * Сортировка сюда не входит: у неё есть свой видимый переключатель, и
 * «сбросить порядок» — это не «сбросить подбор».
 */
export type ActiveCatalogFilter = {
  /** Ключ параметра — он же ключ списка в разметке. */
  readonly key: 'class' | 'area' | 'sale';
  readonly label: string;
  /** Патч, снимающий именно этот параметр и не трогающий соседние. */
  readonly clear: Partial<CatalogFilter>;
};

export function activeCatalogFilters(query: CatalogQuery): readonly ActiveCatalogFilter[] {
  const active: ActiveCatalogFilter[] = [];

  if (query.filter.powerClass !== null) {
    active.push({
      key: 'class',
      label: activeFilterLabel.powerClass(query.filter.powerClass),
      clear: { powerClass: null },
    });
  }

  if (query.filter.area !== null) {
    active.push({
      key: 'area',
      label: activeFilterLabel.area(query.filter.area),
      clear: { area: null },
    });
  }

  if (query.filter.sale) {
    active.push({ key: 'sale', label: activeFilterLabel.sale, clear: { sale: false } });
  }

  return active;
}

/**
 * Адрес страницы модели по её слагу.
 *
 * Функцией из страницы, а не строкой внутри блока: карта URL принадлежит
 * маршрутам (`shared/seo/routes`), а блок обязан рисоваться в Storybook, где
 * маршрутизации нет вовсе.
 */
export type ProductHref = (slug: string) => ButtonLinkHref;

/**
 * Главная фотография: явно отмеченная владельцем, иначе первая по порядку.
 * `null` — фото нет, и карточка рисует заглушку с классом мощности
 * (docs/DESIGN_BRIEF.md §8). Это рабочее состояние: в сидах фото нет ни у
 * одной модели.
 */
export function mainPhoto(photos: readonly ProductPhoto[]): ProductPhoto | null {
  const marked = photos.find((photo) => photo.isMain);
  if (marked !== undefined) return marked;

  const [first] = [...photos].sort((a, b) => a.sort - b.sort);
  return first ?? null;
}
