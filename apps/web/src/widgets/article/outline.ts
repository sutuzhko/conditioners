import type { ArticleBlock, InlineNode } from '@/entities/article/model';
import { pageSlug, uniqueSlug } from '@/shared/lib/slug';

import type { ArticleHeading, OutlinedBlock } from './model';

/** Текст узлов без оформления — для якоря, оглавления и `aria`. */
export function inlineText(nodes: readonly InlineNode[]): string {
  return nodes.map((node) => node.text).join('');
}

export interface ArticleOutline {
  /** блоки в порядке вывода; у заголовков проставлен якорь и выправлен уровень */
  readonly blocks: readonly OutlinedBlock[];
  /** заголовки второго уровня — из них собирается оглавление */
  readonly headings: readonly ArticleHeading[];
}

/** Запасное имя якоря: заголовок из одних знаков препинания дал бы пустой `id`. */
const FALLBACK_ANCHOR = 'razdel';

/**
 * Готовит дерево статьи к выводу: якорь каждому заголовку и выправленный
 * уровень.
 *
 * 🔴 `###` до первого `##` поставил бы `h3` сразу после `h1` — пропуск уровня
 * и нарушение инварианта 4. Владелец правит текст в обычном textarea, и
 * ошибиться разметкой ему ничего не стоит, поэтому уровень чинится при
 * выводе, а не уезжает в HTML как есть.
 *
 * Якорь — слаг заголовка (`#shag-1-moshchnost`), а не порядковый номер:
 * такую ссылку не стыдно скопировать из адресной строки. Совпадения
 * разводятся числовым суффиксом той же функцией, что и адреса страниц.
 */
export function articleOutline(blocks: readonly ArticleBlock[]): ArticleOutline {
  const out: OutlinedBlock[] = [];
  const headings: ArticleHeading[] = [];
  const taken: string[] = [];
  let sawTopLevel = false;

  for (const block of blocks) {
    if (block.kind !== 'heading') {
      out.push(block);
      continue;
    }

    const level = block.level === 3 && sawTopLevel ? 3 : 2;
    if (level === 2) sawTopLevel = true;

    const text = inlineText(block.content).trim();
    const id = uniqueSlug(pageSlug(text, FALLBACK_ANCHOR), taken);
    taken.push(id);

    out.push({ kind: 'heading', level, id, content: block.content });
    if (level === 2) headings.push({ id, level, text });
  }

  return { blocks: out, headings };
}
