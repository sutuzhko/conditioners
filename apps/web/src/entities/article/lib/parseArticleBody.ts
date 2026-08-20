import type { ArticleBlock, InlineNode } from '../model';

/**
 * Разбор мини-разметки статей (PROJECT §2.7, ADR-014).
 *
 *   ## заголовок · ### подзаголовок · - пункт · > врезка · **жирный**
 *   блоки разделяются пустой строкой
 *
 * Возвращается дерево блоков, а не строка HTML: разметку собирает UI-слой.
 * Так текст владельца, вставленный из Word, физически не может принести в
 * вёрстку теги — всё, что не разметка, остаётся текстом.
 */

/** `**жирный**` — единственное инлайн-оформление формата. */
function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const pattern = /\*\*([\s\S]+?)\*\*/g;
  let cursor = 0;

  for (const match of source.matchAll(pattern)) {
    const at = match.index ?? cursor;
    if (at > cursor) nodes.push({ kind: 'text', text: source.slice(cursor, at) });
    nodes.push({ kind: 'strong', text: match[1] ?? '' });
    cursor = at + match[0].length;
  }

  if (cursor < source.length) nodes.push({ kind: 'text', text: source.slice(cursor) });
  return nodes;
}

const HEADING = /^(#{2,3})\s+(.*)$/;
const LIST_ITEM = /^-\s+(.*)$/;
const CALLOUT = /^>\s?(.*)$/;

/**
 * Внутри блока строки одного вида склеиваются: подряд идущие `- ` дают один
 * список, подряд идущие `> ` — одну врезку, прочие строки — один абзац.
 * Заголовок всегда сам по себе.
 */
function parseChunk(lines: readonly string[], out: ArticleBlock[]): void {
  let listItems: InlineNode[][] = [];
  let quoteLines: string[] = [];
  let textLines: string[] = [];

  const flush = (): void => {
    if (listItems.length > 0) {
      out.push({ kind: 'list', items: listItems });
      listItems = [];
    }
    if (quoteLines.length > 0) {
      out.push({ kind: 'callout', content: parseInline(quoteLines.join(' ')) });
      quoteLines = [];
    }
    if (textLines.length > 0) {
      out.push({ kind: 'paragraph', content: parseInline(textLines.join(' ')) });
      textLines = [];
    }
  };

  for (const line of lines) {
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      const level = heading[1]?.length === 3 ? 3 : 2;
      out.push({ kind: 'heading', level, content: parseInline((heading[2] ?? '').trim()) });
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      if (quoteLines.length > 0 || textLines.length > 0) flush();
      listItems.push(parseInline((item[1] ?? '').trim()));
      continue;
    }

    const quote = CALLOUT.exec(line);
    if (quote) {
      if (listItems.length > 0 || textLines.length > 0) flush();
      quoteLines.push((quote[1] ?? '').trim());
      continue;
    }

    if (listItems.length > 0 || quoteLines.length > 0) flush();
    textLines.push(line.trim());
  }

  flush();
}

export function parseArticleBody(body: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];

  // Несколько пустых строк подряд — такой же разделитель, как одна:
  // текст пишет владелец, а не разметчик.
  for (const chunk of body.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const lines = chunk.split('\n').filter((line) => line.trim() !== '');
    if (lines.length > 0) parseChunk(lines, blocks);
  }

  return blocks;
}
