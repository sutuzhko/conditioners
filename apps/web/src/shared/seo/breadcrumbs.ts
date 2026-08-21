import { absoluteUrl, compact, text, type JsonLdNode } from './schema';

/**
 * `BreadcrumbList` — на всех страницах кроме главной (docs/SEO.md §4, §5).
 *
 * Разметка строится из того же списка, что рисует видимый след: у крошек
 * один источник, поэтому подпись в разметке и подпись на экране совпадают
 * по построению (инвариант 9).
 */

export type BreadcrumbItem = {
  /** Подпись в следе — она же `name` в разметке. */
  readonly name: string;
  /**
   * Путь без домена: `/katalog`. У последнего элемента — текущей страницы —
   * пути нет: ссылка на саму себя не нужна ни человеку, ни роботу.
   */
  readonly path?: string | undefined;
};

export type BreadcrumbListInput = {
  readonly siteUrl: string;
  readonly items: readonly BreadcrumbItem[];
};

/**
 * След из одного звена разметкой не является: «Главная» без продолжения не
 * описывает путь, а лишний узел в разметке — лишний повод для диагностики
 * Вебмастера.
 */
export function buildBreadcrumbListJsonLd(input: BreadcrumbListInput): JsonLdNode | null {
  const items = input.items
    .map((item) => ({ name: text(item.name), path: text(item.path) }))
    .filter((item): item is { name: string; path: string | undefined } => item.name !== undefined);

  if (items.length < 2) return null;

  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) =>
      compact({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.path === undefined ? undefined : absoluteUrl(input.siteUrl, item.path),
      }),
    ),
  };
}
