/**
 * Правка модели каталога.
 *
 * Значения формы — строки: поле ввода не умеет отдавать число, а схема
 * `productInputSchema` приводит их сама (`z.coerce`). Приводить здесь ещё
 * раз — значит завести второе место, где рождается цена.
 */
import type { Route } from 'next';

/**
 * Пара характеристики без `sort`: порядок задаётся положением в списке, и
 * присылать его отдельно — значит иметь два источника одного порядка. Ровно
 * это же поле опускает `productInputSchema`.
 */
export type SpecPair = { readonly k: string; readonly v: string };

/**
 * Адреса раздела, окна создания и справочника характеристик.
 *
 * Проверены маршрутом через `satisfies`, а не аннотацией `: Route`: аннотация
 * расширила бы тип до объединения всех маршрутов, и `${CATALOG_PATH}/${id}`
 * перестал бы быть адресом карточки модели. Подробнее — в
 * `article-form/model.ts`.
 */
export const CATALOG_PATH = '/admin/catalog' satisfies Route;
export const CATALOG_NEW_PATH = '/admin/catalog/new' satisfies Route;
export const CATALOG_SPECS_PATH = '/admin/catalog/specs' satisfies Route;

export type ProductFormValues = {
  readonly name: string;
  readonly badge: string;
  readonly areaMax: string;
  readonly priceNum: string;
  readonly tag: string;
  readonly brand: string;
  readonly sku: string;
  readonly link: string;
  readonly slug: string;
  readonly sort: string;
  /** «В продаже»: модель есть в каталоге и её можно заказать. */
  readonly visible: boolean;
  /**
   * «Показывать на главной» — витрина лендинга (ADR-109).
   *
   * 🔴 Необязательное: `undefined` означает «редактор про витрину не знал»,
   * и тогда поле не отправляется вовсе, а признак в базе остаётся прежним.
   * Значение по умолчанию `false` здесь молча снимало бы модели с главной
   * при сохранении любой карточки.
   */
  readonly featured?: boolean | undefined;
  readonly seoTitle: string;
  readonly seoDescription: string;
  /** 🔴 Произвольные пары: фиксированного набора характеристик нет (ADR-015). */
  readonly specs: readonly SpecPair[];
};

export type ProductFormStatus = 'idle' | 'sending' | 'success' | 'error';

export type ProductSaveResult =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly message: string; readonly field?: string };

export type ProductSave = (values: ProductFormValues) => Promise<ProductSaveResult>;

export type ProductDelete = () => Promise<{ readonly ok: boolean; readonly message?: string }>;

export const emptyProductValues: ProductFormValues = {
  name: '',
  badge: '',
  areaMax: '',
  priceNum: '',
  tag: '',
  brand: '',
  sku: '',
  link: '',
  slug: '',
  sort: '0',
  visible: true,
  featured: false,
  seoTitle: '',
  seoDescription: '',
  specs: [],
};
