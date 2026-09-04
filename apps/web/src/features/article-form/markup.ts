/**
 * Панель инструментов редактора статьи: вставка мини-разметки.
 *
 * 🔴 Здесь ровно те виды, которые сайт действительно рисует (ADR-282):
 * `##`, `###`, `- `, `> ` и `**жирный**` — весь формат `parseArticleBody`
 * (PROJECT §2.7, ADR-014). Курсива, ссылок, картинок и таблиц в формате нет,
 * и кнопки для них вставляли бы текст, который на сайте покажется как есть:
 * владелец увидел бы в панели ссылку, а посетитель — квадратные скобки.
 *
 * Функция чистая: строка и границы выделения внутрь, новая строка и новые
 * границы наружу. Ставит их в поле уже компонент — тестируется правило, а не
 * работа с DOM.
 */

export type MarkupKind = 'h2' | 'h3' | 'bold' | 'list' | 'callout';

export type MarkupResult = {
  readonly body: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
};

/** Строчные виды: префикс ставится в начало каждой задетой строки. */
const LINE_PREFIX: Readonly<Record<Exclude<MarkupKind, 'bold'>, string>> = {
  h2: '## ',
  h3: '### ',
  list: '- ',
  callout: '> ',
};

const BOLD = '**';

/** Начало строки, в которую попала позиция. */
function lineStart(body: string, at: number): number {
  return body.lastIndexOf('\n', Math.max(0, at - 1)) + 1;
}

/** Конец строки, в которую попала позиция; без символа перевода. */
function lineEnd(body: string, at: number): number {
  const found = body.indexOf('\n', at);
  return found === -1 ? body.length : found;
}

/**
 * Снятие любого известного строчного префикса.
 *
 * Снимается не только свой: заголовок второго уровня, к которому применили
 * третий, обязан стать третьим, а не «### ## заголовком».
 */
function withoutPrefix(line: string): string {
  for (const prefix of Object.values(LINE_PREFIX)) {
    if (line.startsWith(prefix)) return line.slice(prefix.length);
  }
  return line;
}

function toggleLines(body: string, start: number, end: number, prefix: string): MarkupResult {
  const from = lineStart(body, start);
  const to = lineEnd(body, end);

  const lines = body.slice(from, to).split('\n');
  /* Повторное нажатие снимает разметку: кнопка — переключатель, а не
     накопитель решёток. */
  const off = lines.every((line) => line.startsWith(prefix));

  const next = lines
    .map((line) => (off ? line.slice(prefix.length) : `${prefix}${withoutPrefix(line)}`))
    .join('\n');

  return {
    body: `${body.slice(0, from)}${next}${body.slice(to)}`,
    selectionStart: from,
    selectionEnd: from + next.length,
  };
}

function toggleBold(body: string, start: number, end: number): MarkupResult {
  const selected = body.slice(start, end);

  if (selected.startsWith(BOLD) && selected.endsWith(BOLD) && selected.length >= BOLD.length * 2) {
    const inner = selected.slice(BOLD.length, selected.length - BOLD.length);
    return {
      body: `${body.slice(0, start)}${inner}${body.slice(end)}`,
      selectionStart: start,
      selectionEnd: start + inner.length,
    };
  }

  const wrapped = `${BOLD}${selected}${BOLD}`;

  return {
    body: `${body.slice(0, start)}${wrapped}${body.slice(end)}`,
    /* Пустое выделение — курсор между звёздочками: следующее, что наберут,
       окажется внутри жирного, а не после него. */
    selectionStart: start + BOLD.length,
    selectionEnd: start + BOLD.length + selected.length,
  };
}

export function applyMarkup(
  body: string,
  selectionStart: number,
  selectionEnd: number,
  kind: MarkupKind,
): MarkupResult {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  if (kind === 'bold') return toggleBold(body, start, end);
  return toggleLines(body, start, end, LINE_PREFIX[kind]);
}
