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
 * Сколько моделей витрина показывает сразу (issue #260). Остальные лежат в
 * HTML и раскрываются кнопкой.
 *
 * 🔴 Число связано с правилом `.clipped > li:nth-child(n + 4)` в
 * `ui/grid.module.css`: `nth-child` не умеет читать переменную, поэтому связь
 * держит тест, а не язык.
 */
export const SHOWCASE_LIMIT = 3;

/** Сколько похожих моделей показывать под характеристиками. */
export const SIMILAR_LIMIT = 3;

/**
 * Похожие модели для страницы товара.
 *
 * 🔴 Чистая функция над уже загруженным каталогом: страница модели
 * пререндерится с `revalidate = 3600`, и отдельный запрос «похожее» стоил бы
 * второго похода в базу на каждую пересборку. Список приходит из того же
 * `loadCatalog`, которым собираются статические адреса раздела.
 *
 * Отбор идёт по классу мощности — это единственный признак, по которому две
 * модели действительно взаимозаменяемы: класс задаёт и площадь, и цену.
 * Внутри класса ближе тот, у кого площадь ближе к текущей. Когда моделей
 * класса не хватает, список добирается остальными по той же близости
 * площади: пустой раздел «похожие» на странице единственной канальной модели
 * был бы честнее, но бесполезнее — человеку всё равно нужно куда-то пойти.
 */
export function similarProducts(
  catalog: readonly CatalogProduct[],
  current: CatalogProduct,
  limit: number = SIMILAR_LIMIT,
): readonly CatalogProduct[] {
  const byArea = (a: CatalogProduct, b: CatalogProduct): number => {
    const diff = Math.abs(a.areaMax - current.areaMax) - Math.abs(b.areaMax - current.areaMax);
    return diff === 0 ? a.sort - b.sort : diff;
  };

  const others = catalog.filter((product) => product.visible && product.slug !== current.slug);
  const sameClass = others.filter((product) => product.badge === current.badge).sort(byArea);
  const rest = others.filter((product) => product.badge !== current.badge).sort(byArea);

  return [...sameClass, ...rest].slice(0, limit);
}

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
