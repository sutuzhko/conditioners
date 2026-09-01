#!/usr/bin/env node
/**
 * Текстовый формат измерений раскладки — один файл на историю (ADR-230, фаза 4
 * плана снимков, issue #461).
 *
 * 🔴 Зачем текст, а не PNG. Эталоны снимков ушли из репозитория: 123 МБ
 * двоичных файлов и весь прирост `.git`. То, ради чего они там лежали, —
 * «изменение внешнего вида видно в диффе PR и проходит ревью вместе с кодом»
 * (ADR-168), — возвращается текстом: геометрия и палитра каждой истории лежат
 * в `apps/web/e2e/vr/measurements/<storyId>.txt`, сжимаются дельтой и читаются
 * в диффе как бриф: «радиус карточки 12 → 11 у четырнадцати историй».
 *
 * Идентичность узла — путь по записанным предкам, а не ключ: ключ уникален
 * только среди соседей под одним предком (`#2`, `#3` у повторов), и одинаковые
 * `span.Card__price` под `li.Card__root#2` и `li.Card__root#3` различаются
 * именно предком. В полных секциях путь выражен отступом дерева; в секциях
 * расхождений, где узлы стоят вразнобой, путь написан явно через ` > `.
 *
 * Устройство файла.
 *   `# <история> · ширины … · темы …`, `шрифты: …` — шапка;
 *   `[документ]` — ширина прокрутки и высота на каждой ширине;
 *   `[геометрия <ширина>]` — дерево узлов отступом: размер и смещение от
 *     записанного предка, шрифт, радиус, граница, интервал, число строк, флаги
 *     `fixed`/`clipped`, текст в «кавычках» последним;
 *   `[геометрия <ширина> dark]` — только узлы, чья геометрия в тёмной теме
 *     расходится со светлой больше чем на 1px, путём: у темы нет права двигать
 *     раскладку, и такая секция — находка, а не норма;
 *   `[палитра <тема>]` — дерево узлов отступом с цветами на наибольшей ширине;
 *   `[палитра <тема> @<ширина>]` — только узлы, чья палитра на этой ширине
 *     отличается от палитры на наибольшей, путём.
 *
 * Поля строки разделены двумя пробелами; внутри значения пробелы одиночные —
 * так `box-shadow` с запятыми и пробелами и путь с ` > ` не ломают разбор.
 * Порядок узлов — документный, ключи — как отдал измеритель.
 *
 * `formatStory` и `parseStory` обратимы: `parseStory(formatStory(p))` даёт ту
 * же модель, что `buildModel(p)` — на этом стоит сравнение (`measurements-
 * compare.mjs`), которое работает со структурой, а не с текстом.
 */

/** Допуск, с которого геометрия тёмной темы считается разошедшейся со светлой. */
export const THEME_GEOMETRY_TOLERANCE = 1;

const THEMES = ['light', 'dark'];
const SEP = '  ';
const PATH_SEP = ' > ';

/* ---------- модель ---------- */

const collapse = (text) => String(text).replace(/\s+/g, ' ').trim();

/** Текст в файле — до 40 знаков, без переносов и без закрывающей кавычки внутри. */
export function normaliseText(text) {
  const clean = collapse(text).replace(/»/g, '"');
  return clean.length > 40 ? `${clean.slice(0, 39)}…` : clean;
}

/**
 * Путь каждого узла по цепочке записанных предков. Измеритель называет
 * предка ключом, а ключ уникален лишь среди соседей — поэтому предок ищется
 * стеком по документному порядку: ближайший открытый узел с этим ключом.
 */
export function attachPaths(nodes) {
  const stack = [];
  return nodes.map((node) => {
    const parent = node.parent ?? null;
    if (parent === null) {
      stack.length = 0;
    } else {
      while (stack.length > 0 && stack[stack.length - 1].key !== parent) stack.pop();
      if (stack.length === 0) {
        throw new Error(`у узла ${node.key} предок ${parent} не найден среди открытых узлов`);
      }
    }
    const path =
      stack.length === 0 ? node.key : `${stack[stack.length - 1].path}${PATH_SEP}${node.key}`;
    stack.push({ key: node.key, path });
    return { node, path, depth: stack.length - 1 };
  });
}

function geometryOf({ node, path, depth }) {
  const entry = {
    key: node.key,
    path,
    depth,
    x: Math.round(node.x),
    y: Math.round(node.y),
    w: Math.round(node.w),
    h: Math.round(node.h),
  };
  const g = node.geometry ?? {};
  if (g.font !== undefined) entry.font = collapse(g.font);
  if (g.radius !== undefined) entry.radius = collapse(g.radius);
  if (g.border !== undefined) entry.border = collapse(g.border);
  if (g.letterSpacing !== undefined) entry.letterSpacing = collapse(g.letterSpacing);
  if (node.lines !== undefined) entry.lines = node.lines;
  if (node.fixed === true) entry.fixed = true;
  if (node.clipped === true) entry.clipped = true;
  if (node.text !== undefined && collapse(node.text) !== '') entry.text = normaliseText(node.text);
  return entry;
}

const PALETTE_FIELDS = ['color', 'bg', 'border', 'shadow', 'outline', 'gradient'];

function paletteOf({ node, path, depth }) {
  const entry = { key: node.key, path, depth };
  const p = node.palette ?? {};
  for (const field of PALETTE_FIELDS) {
    if (p[field] !== undefined) entry[field] = collapse(p[field]).toLowerCase();
  }
  return entry;
}

function sameGeometry(a, b) {
  if (a === undefined || b === undefined) return false;
  const near = (x, y) => Math.abs(x - y) <= THEME_GEOMETRY_TOLERANCE;
  return (
    near(a.x, b.x) &&
    near(a.y, b.y) &&
    near(a.w, b.w) &&
    near(a.h, b.h) &&
    a.font === b.font &&
    a.radius === b.radius &&
    a.border === b.border &&
    a.letterSpacing === b.letterSpacing &&
    a.lines === b.lines &&
    a.fixed === b.fixed &&
    a.clipped === b.clipped
  );
}

function samePalette(a, b) {
  if (a === undefined || b === undefined) return false;
  return PALETTE_FIELDS.every((field) => a[field] === b[field]);
}

const byPath = (list) => new Map(list.map((n) => [n.path, n]));

/**
 * Модель истории из частичных измерений — по одному на пару «ширина + тема».
 * Порядок входных файлов на результат не влияет: пары сортируются.
 */
export function buildModel(partials) {
  if (partials.length === 0) throw new Error('нет ни одного измерения истории');
  const story = partials[0].story;
  for (const partial of partials) {
    if (partial.story !== story) {
      throw new Error(`измерения разных историй в одной модели: ${story} и ${partial.story}`);
    }
  }

  const sorted = [...partials].sort(
    (a, b) => a.width - b.width || THEMES.indexOf(a.theme) - THEMES.indexOf(b.theme),
  );
  const widths = [...new Set(sorted.map((p) => p.width))].sort((a, b) => a - b);
  const themes = THEMES.filter((theme) => sorted.some((p) => p.theme === theme));
  const pairs = new Map(sorted.map((p) => [`${p.width}/${p.theme}`, p]));
  const pair = (width, theme) => pairs.get(`${width}/${theme}`);
  const pathed = new Map(sorted.map((p) => [p, attachPaths(p.nodes)]));

  const fonts = [...new Set(sorted.flatMap((p) => p.fonts ?? []).map(collapse))].sort((a, b) =>
    a.localeCompare(b, 'en'),
  );

  const document = {};
  for (const width of widths) {
    const source = pair(width, 'light') ?? pair(width, themes[0]);
    document[width] = {
      scrollWidth: Math.round(source.document.scrollWidth),
      scrollHeight: Math.round(source.document.scrollHeight),
    };
  }

  const geometry = {};
  const geometryDark = {};
  for (const width of widths) {
    const light = pair(width, 'light') ?? pair(width, themes[0]);
    const nodes = pathed.get(light).map(geometryOf);
    geometry[width] = nodes;

    const dark = pair(width, 'dark');
    if (dark === undefined || light.theme === 'dark') continue;
    const lightMap = byPath(nodes);
    const darkNodes = pathed.get(dark).map(geometryOf);
    const darkPaths = new Set(darkNodes.map((n) => n.path));
    const diverged = darkNodes.filter((n) => !sameGeometry(lightMap.get(n.path), n));
    const missing = nodes.filter((n) => !darkPaths.has(n.path)).map((n) => n.path);
    if (diverged.length > 0 || missing.length > 0) geometryDark[width] = { diverged, missing };
  }

  const palette = {};
  const paletteAt = {};
  const widest = widths[widths.length - 1];
  for (const theme of themes) {
    const main = pair(widest, theme);
    if (main === undefined) continue;
    palette[theme] = pathed.get(main).map(paletteOf);
    const mainMap = byPath(palette[theme]);
    for (const width of widths) {
      if (width === widest) continue;
      const other = pair(width, theme);
      if (other === undefined) continue;
      const differing = pathed
        .get(other)
        .map(paletteOf)
        .filter((entry) => !samePalette(mainMap.get(entry.path), entry));
      if (differing.length > 0) {
        paletteAt[theme] ??= {};
        paletteAt[theme][width] = differing;
      }
    }
  }

  return { story, widths, themes, fonts, document, geometry, geometryDark, palette, paletteAt };
}

/* ---------- запись ---------- */

function geometryFields(node) {
  const fields = [`${node.w}×${node.h} @${node.x},${node.y}`];
  if (node.font !== undefined) fields.push(node.font);
  if (node.radius !== undefined) fields.push(`r${node.radius}`);
  if (node.border !== undefined) fields.push(`b${node.border}`);
  if (node.letterSpacing !== undefined) fields.push(`ls${node.letterSpacing}`);
  if (node.lines !== undefined) fields.push(`lines=${node.lines}`);
  if (node.fixed === true) fields.push('fixed');
  if (node.clipped === true) fields.push('clipped');
  if (node.text !== undefined) fields.push(`«${node.text}»`);
  return fields.join(SEP);
}

function paletteFields(entry) {
  return PALETTE_FIELDS.filter((field) => entry[field] !== undefined)
    .map((field) => `${field} ${entry[field]}`)
    .join(SEP);
}

const treeLine = (node, fields) =>
  `${'  '.repeat(node.depth)}${node.key}${fields === '' ? '' : SEP + fields}`;
const pathLine = (node, fields) => `${node.path}${fields === '' ? '' : SEP + fields}`;

export function formatModel(model) {
  const lines = [];
  lines.push(
    `# ${model.story} · ширины ${model.widths.join(' ')} · темы ${model.themes.join(' ')}`,
  );
  lines.push(`шрифты: ${model.fonts.length === 0 ? '—' : model.fonts.join(', ')}`);
  lines.push('');

  lines.push('[документ]');
  for (const width of model.widths) {
    const doc = model.document[width];
    lines.push(`${width} → ${doc.scrollWidth}×${doc.scrollHeight}`);
  }
  lines.push('');

  for (const width of model.widths) {
    lines.push(`[геометрия ${width}]`);
    for (const node of model.geometry[width]) lines.push(treeLine(node, geometryFields(node)));
    const dark = model.geometryDark[width];
    if (dark !== undefined) {
      lines.push(`[геометрия ${width} dark]`);
      for (const node of dark.diverged) lines.push(pathLine(node, geometryFields(node)));
      for (const path of dark.missing) lines.push(`− ${path}`);
    }
    lines.push('');
  }

  for (const theme of model.themes) {
    const entries = model.palette[theme];
    if (entries === undefined) continue;
    lines.push(`[палитра ${theme}]`);
    for (const entry of entries) lines.push(treeLine(entry, paletteFields(entry)));
    const at = model.paletteAt[theme] ?? {};
    for (const width of Object.keys(at)
      .map(Number)
      .sort((a, b) => a - b)) {
      lines.push(`[палитра ${theme} @${width}]`);
      for (const entry of at[width]) lines.push(pathLine(entry, paletteFields(entry)));
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function formatStory(partials) {
  return formatModel(buildModel(partials));
}

/* ---------- чтение ---------- */

const HEADER = /^# (.+?) · ширины ([\d ]+) · темы ([a-z ]+)$/;
const SECTION = /^\[(документ|геометрия (\d+)( dark)?|палитра ([a-z]+)( @(\d+))?)\]$/;
const SIZE = /^(-?\d+)×(-?\d+) @(-?\d+),(-?\d+)$/;

function splitTree(raw, stack) {
  const indent = raw.match(/^ */)[0].length;
  const depth = indent / 2;
  const [head, ...rest] = raw.slice(indent).split(SEP);
  stack.length = depth;
  const path = depth === 0 ? head : `${stack[depth - 1]}${PATH_SEP}${head}`;
  stack[depth] = path;
  return { key: head, path, depth, rest };
}

function splitPath(raw) {
  const [path, ...rest] = raw.split(SEP);
  const segments = path.split(PATH_SEP);
  return { key: segments[segments.length - 1], path, depth: segments.length - 1, rest };
}

function geometryNode({ key, path, depth, rest }) {
  const node = { key, path, depth, x: 0, y: 0, w: 0, h: 0 };
  for (const field of rest) {
    const size = field.match(SIZE);
    if (size !== null) {
      node.w = Number(size[1]);
      node.h = Number(size[2]);
      node.x = Number(size[3]);
      node.y = Number(size[4]);
    } else if (field.startsWith('«') && field.endsWith('»')) node.text = field.slice(1, -1);
    else if (field.startsWith('lines=')) node.lines = Number(field.slice('lines='.length));
    else if (field === 'fixed') node.fixed = true;
    else if (field === 'clipped') node.clipped = true;
    else if (/^ls[-\d.]/.test(field)) node.letterSpacing = field.slice(2);
    else if (/^r[\d.]/.test(field)) node.radius = field.slice(1);
    else if (/^b[\d.]/.test(field)) node.border = field.slice(1);
    else node.font = field;
  }
  return node;
}

function paletteEntry({ key, path, depth, rest }) {
  const entry = { key, path, depth };
  for (const field of rest) {
    const space = field.indexOf(' ');
    const name = space === -1 ? field : field.slice(0, space);
    if (!PALETTE_FIELDS.includes(name)) throw new Error(`неизвестное поле палитры: ${field}`);
    entry[name] = field.slice(space + 1);
  }
  return entry;
}

/**
 * Модель из текста файла. Бросает на строке, которую не понимает: молча
 * пропущенная строка означала бы молча пропущенное изменение.
 */
export function parseStory(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const header = (lines[0] ?? '').match(HEADER);
  if (header === null) throw new Error(`нет шапки истории: «${lines[0]}»`);

  const model = {
    story: header[1],
    widths: header[2].trim().split(/\s+/).map(Number),
    themes: header[3].trim().split(/\s+/),
    fonts: [],
    document: {},
    geometry: {},
    geometryDark: {},
    palette: {},
    paletteAt: {},
  };

  const fontsLine = lines[1] ?? '';
  if (!fontsLine.startsWith('шрифты: ')) throw new Error(`нет строки шрифтов: «${fontsLine}»`);
  const fontsValue = fontsLine.slice('шрифты: '.length);
  model.fonts = fontsValue === '—' ? [] : fontsValue.split(', ');

  let section = null;
  let stack = [];
  for (let i = 2; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.trim() === '') continue;
    const head = raw.match(SECTION);
    if (head !== null) {
      stack = [];
      if (head[1] === 'документ') section = { kind: 'document' };
      else if (head[2] !== undefined) {
        const width = Number(head[2]);
        if (head[3] === undefined) {
          section = { kind: 'geometry', width };
          model.geometry[width] = [];
        } else {
          section = { kind: 'geometryDark', width };
          model.geometryDark[width] = { diverged: [], missing: [] };
        }
      } else {
        const theme = head[4];
        if (head[6] === undefined) {
          section = { kind: 'palette', theme };
          model.palette[theme] = [];
        } else {
          const width = Number(head[6]);
          section = { kind: 'paletteAt', theme, width };
          model.paletteAt[theme] ??= {};
          model.paletteAt[theme][width] = [];
        }
      }
      continue;
    }
    if (section === null) throw new Error(`строка вне секции: «${raw}»`);

    if (section.kind === 'document') {
      const m = raw.match(/^(\d+) → (\d+)×(\d+)$/);
      if (m === null) throw new Error(`не разобрана строка документа: «${raw}»`);
      model.document[Number(m[1])] = { scrollWidth: Number(m[2]), scrollHeight: Number(m[3]) };
    } else if (section.kind === 'geometry') {
      model.geometry[section.width].push(geometryNode(splitTree(raw, stack)));
    } else if (section.kind === 'geometryDark') {
      if (raw.startsWith('− ')) model.geometryDark[section.width].missing.push(raw.slice(2));
      else model.geometryDark[section.width].diverged.push(geometryNode(splitPath(raw)));
    } else if (section.kind === 'palette') {
      model.palette[section.theme].push(paletteEntry(splitTree(raw, stack)));
    } else if (section.kind === 'paletteAt') {
      model.paletteAt[section.theme][section.width].push(paletteEntry(splitPath(raw)));
    }
  }

  return model;
}
