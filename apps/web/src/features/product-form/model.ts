/**
 * Правка модели каталога.
 *
 * Значения формы — строки: поле ввода не умеет отдавать число, а схема
 * `productInputSchema` приводит их сама (`z.coerce`). Приводить здесь ещё
 * раз — значит завести второе место, где рождается цена.
 */
/**
 * Пара характеристики без `sort`: порядок задаётся положением в списке, и
 * присылать его отдельно — значит иметь два источника одного порядка. Ровно
 * это же поле опускает `productInputSchema`.
 */
export type SpecPair = { readonly k: string; readonly v: string };

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
  readonly visible: boolean;
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
  seoTitle: '',
  seoDescription: '',
  specs: [],
};
