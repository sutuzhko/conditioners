/**
 * Ключи вкладок панели — issue #339.
 *
 * Тридцать вкладок макета — тридцать адресов: `/admin/reviews?tab=pending`
 * отправляется коллеге ссылкой, «назад» возвращает на предыдущую вкладку, а
 * не выбрасывает из раздела.
 *
 * 🔴 Ключ и значения по-английски (инвариант 17, ADR-042, ADR-049). Русскими
 * остаются подписи на экране — они живут в `content` своей фичи, и здесь их
 * нет намеренно: словарь описывает адрес, а не текст.
 *
 * 🔴 Словарь — контракт адреса, а не перечень доменных значений. Там, где
 * макет называет вкладку иначе, чем домен называет своё поле (`declined` при
 * статусе `cancelled`, `published` при статусе `approved`), перевод делает
 * раздел на своей границе (ADR-255). Домен и API от переименования вкладки
 * на экране не двигаются.
 *
 * Порядок ключей — порядок вкладок на экране: первый ключ и есть вкладка по
 * умолчанию, которой открывается раздел без параметра.
 */
import { z } from 'zod';

export const PANEL_TABS = {
  /** Карточка заказа — CRM.md §3.3. */
  orderCard: ['job', 'materials', 'checklist', 'documents', 'history'],
  /** Список нарядов: стопки по состоянию работы. */
  orders: ['active', 'new', 'history', 'declined', 'all'],
  /** Карточка клиента. */
  clientCard: ['data', 'orders', 'units'],
  /** Карточка монтажника. */
  staffCard: ['account', 'orders', 'payouts', 'notes'],
  /** Склад: остатки, журнал движений, зоны хранения. */
  stock: ['stock', 'log', 'zones'],
  /** Модерация отзывов. */
  reviews: ['pending', 'published', 'rejected', 'all'],
  /** Правка статьи базы знаний. */
  article: ['text', 'seo', 'publish'],
  /** Сводка панели. */
  overview: ['overview', 'work', 'money'],
} as const satisfies Record<string, readonly [string, ...string[]]>;

/** Раздел со вкладками. Тип выводится из словаря, а не пишется руками рядом. */
export type PanelTabSection = keyof typeof PANEL_TABS;

/** Вкладка раздела: `PanelTab<'reviews'>` — это `'pending' | ... | 'all'`. */
export type PanelTab<S extends PanelTabSection = PanelTabSection> = (typeof PANEL_TABS)[S][number];

/**
 * Схема параметра `tab` для набора вкладок.
 *
 * Значение приходит снаружи — из ссылки в письме, из закладки, от бота, — и
 * разбирается схемой, как любые данные с границы. Всё, чего нет в наборе,
 * схема не отвергает, а приводит к первой вкладке: раздел обязан открыться и
 * по кривому адресу (issue #341).
 *
 * Набор передаётся явно, а не выводится из имени раздела: собранных вкладок
 * бывает меньше, чем в словаре, и открывать `?tab=materials` панелью,
 * которой ещё нет, нельзя.
 */
export function panelTabSchema<T extends string>(
  tabs: readonly [T, ...T[]],
): z.ZodType<T, z.ZodTypeDef, unknown> {
  return z.enum(tabs).catch(tabs[0]);
}

/** Вкладка из значения в адресе. Мусор и пустота — первая вкладка набора. */
export function resolvePanelTab<T extends string>(tabs: readonly [T, ...T[]], value: unknown): T {
  return panelTabSchema(tabs).parse(value);
}
