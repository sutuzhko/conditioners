/**
 * Коллектор измерений раскладки истории (ADR-230, фаза 4, issue #460).
 *
 * Выполняется в странице через `page.evaluate` и возвращает частичное
 * измерение одной пары «ширина + тема»: дерево записанных узлов с
 * координатами относительно ближайшего записанного предка, белым списком
 * вычисленных свойств, текстом и числом строк; документ; загруженные грани
 * шрифтов. Из частей Node-сторона собирает текстовый файл истории —
 * геометрия по ширинам, палитра по темам — и сравнивает с тем, что лежит в
 * репозитории.
 *
 * 🔴 Записываются не все элементы, а «значимые»: с модульным классом,
 * интерактивные, с собственным текстом, картинки, псевдоэлементы с
 * содержимым. Обёртка без стилей и текста узлом не становится, а координаты
 * считаются от ближайшего ЗАПИСАННОГО предка — поэтому лишний `<div>` ради
 * структуры не меняет в снимке ни строки. Координаты округляются до целого:
 * дробные ширины текста плавают, а 1px — уже настоящий сдвиг.
 *
 * 🔴 Функция самодостаточна: все помощники внутри тела, импортов нет —
 * `page.evaluate` сериализует её исходник и исполняет в браузере.
 */

export type MeasuredNode = {
  /** «section.Pricing__root», «li.Card__root#2», «button[role=tab]», «img», «h2.Pricing__title::before». */
  readonly key: string;
  /** Ключ ближайшего записанного предка; у корней — `null`. */
  readonly parent: string | null;
  /** `position: fixed | sticky` — координаты от окна, а не от предка. */
  readonly fixed: boolean;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Тема-независимое: шрифт «Onest 600 28/36», радиус, толщина границы, разрядка. */
  readonly geometry: {
    readonly font?: string;
    readonly radius?: string;
    readonly border?: string;
    readonly letterSpacing?: string;
  };
  /** Тема-зависимое: hex строчными, прозрачное пропущено. */
  readonly palette: {
    readonly color?: string;
    readonly bg?: string;
    readonly border?: string;
    readonly shadow?: string;
    readonly outline?: string;
    readonly gradient?: string;
  };
  /** Собственный текст узла — схлопнутые пробелы, до 40 знаков. */
  readonly text?: string;
  /** Число строк собственного текста. */
  readonly lines?: number;
  /** `overflow: hidden | clip`, и содержимое шире или выше рамки. */
  readonly clipped?: true;
};

export type PartialMeasurement = {
  readonly story: string;
  readonly width: number;
  readonly theme: 'light' | 'dark';
  readonly document: { readonly scrollWidth: number; readonly scrollHeight: number };
  /** Загруженные грани «Семейство вес», отсортированы, без дублей. */
  readonly fonts: readonly string[];
  /** В порядке документа. */
  readonly nodes: readonly MeasuredNode[];
};

export type CollectInput = {
  readonly theme: 'light' | 'dark';
  readonly width: number;
};

export async function collectMeasurements(input: CollectInput): Promise<PartialMeasurement> {
  type Geometry = MeasuredNode['geometry'];
  type Palette = MeasuredNode['palette'];
  type Mutable<T> = { -readonly [K in keyof T]: T[K] };

  const STABLE_CLASS = /^[A-Z][A-Za-z0-9]*__[A-Za-z0-9-]+$/;
  /* Хешированное имя Vite: `_local_hash_n`. Без переменной стабильных имён
     локальный прогон читается хотя бы как `?__local`. */
  const HASHED_CLASS = /^_([A-Za-z][A-Za-z0-9-]*)_[a-z0-9]+_\d+$/;
  const INTERACTIVE = 'a[href], button, input, select, textarea, [role]';
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
  const TEXT_LIMIT = 40;

  const round = (value: number): number => Math.round(value);

  /** «rgb(r, g, b)» / «rgba(r g b / a)» → «#rrggbb» или «#rrggbbaa»; прозрачное — пусто. */
  const toHex = (raw: string): string | undefined => {
    const match = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/.exec(
      raw,
    );
    if (match === null) return raw === 'transparent' ? undefined : raw;
    const channel = (value: string | undefined): string =>
      Math.round(Number(value ?? 0))
        .toString(16)
        .padStart(2, '0');
    const alphaRaw = match[4];
    const alpha =
      alphaRaw === undefined
        ? 1
        : alphaRaw.endsWith('%')
          ? Number(alphaRaw.slice(0, -1)) / 100
          : Number(alphaRaw);
    if (alpha <= 0) return undefined;
    const rgb = `#${channel(match[1])}${channel(match[2])}${channel(match[3])}`;
    return alpha >= 1 ? rgb : `${rgb}${channel(String(alpha * 255))}`;
  };

  /** Все цвета внутри строки (тень, градиент) — в hex. */
  const hexInside = (raw: string): string =>
    raw.replace(/rgba?\([^)]*\)/g, (color) => toHex(color) ?? 'transparent');

  /** Четыре стороны → одно значение, если равны; иначе все четыре. */
  const collapse = (values: readonly string[]): string =>
    values.every((value) => value === values[0]) ? (values[0] ?? '') : values.join(' ');

  const px = (value: string): string => {
    const number = Number.parseFloat(value);
    return Number.isNaN(number) ? value : String(round(number));
  };

  const moduleClass = (el: Element): string | null => {
    for (const cls of el.classList) {
      if (STABLE_CLASS.test(cls)) return cls;
      const hashed = HASHED_CLASS.exec(cls);
      if (hashed !== null) return `?__${hashed[1] ?? ''}`;
    }
    return null;
  };

  const ownText = (el: Element): string => {
    let text = '';
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) text += child.textContent ?? '';
    }
    return text.replace(/\s+/g, ' ').trim();
  };

  const ownLines = (el: Element): number => {
    const tops = new Set<number>();
    for (const child of el.childNodes) {
      if (child.nodeType !== Node.TEXT_NODE || (child.textContent ?? '').trim() === '') continue;
      const range = document.createRange();
      range.selectNodeContents(child);
      for (const rect of range.getClientRects()) {
        if (rect.width > 0) tops.add(round(rect.top));
      }
    }
    return tops.size;
  };

  const geometryOf = (style: CSSStyleDeclaration, hasText: boolean): Geometry => {
    const geometry: Mutable<Geometry> = {};
    if (hasText) {
      const family = (style.fontFamily.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '');
      const lineHeight = style.lineHeight === 'normal' ? 'normal' : px(style.lineHeight);
      geometry.font = `${family} ${style.fontWeight} ${px(style.fontSize)}/${lineHeight}`;
      if (style.letterSpacing !== 'normal') geometry.letterSpacing = px(style.letterSpacing);
    }
    const radius = collapse([
      px(style.borderTopLeftRadius),
      px(style.borderTopRightRadius),
      px(style.borderBottomRightRadius),
      px(style.borderBottomLeftRadius),
    ]);
    if (radius !== '0') geometry.radius = radius;
    const border = collapse([
      px(style.borderTopWidth),
      px(style.borderRightWidth),
      px(style.borderBottomWidth),
      px(style.borderLeftWidth),
    ]);
    if (border !== '0') geometry.border = border;
    return geometry;
  };

  const paletteOf = (style: CSSStyleDeclaration, hasText: boolean, hasBorder: boolean): Palette => {
    const palette: Mutable<Palette> = {};
    if (hasText) {
      const color = toHex(style.color);
      if (color !== undefined) palette.color = color;
    }
    const bg = toHex(style.backgroundColor);
    if (bg !== undefined) palette.bg = bg;
    if (hasBorder) {
      const border = collapse(
        [
          style.borderTopColor,
          style.borderRightColor,
          style.borderBottomColor,
          style.borderLeftColor,
        ].map((color) => toHex(color) ?? 'transparent'),
      );
      palette.border = border;
    }
    if (style.boxShadow !== 'none') palette.shadow = hexInside(style.boxShadow);
    if (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0) {
      const outline = toHex(style.outlineColor);
      if (outline !== undefined) palette.outline = outline;
    }
    /* Картинки фона не записываются: `url(` и data-URI нестабильны и
       нечитаемы, а градиент — часть палитры. */
    if (style.backgroundImage.includes('gradient(') && !style.backgroundImage.includes('url(')) {
      palette.gradient = hexInside(style.backgroundImage);
    }
    return palette;
  };

  const nodes: MeasuredNode[] = [];
  /** Счётчик одинаковых ключей под одним записанным предком. */
  const siblings = new Map<string | null, Map<string, number>>();

  const uniqueKey = (parent: string | null, base: string): string => {
    const bucket = siblings.get(parent) ?? new Map<string, number>();
    siblings.set(parent, bucket);
    const seen = (bucket.get(base) ?? 0) + 1;
    bucket.set(base, seen);
    return seen === 1 ? base : `${base}#${seen}`;
  };

  type Frame = { readonly key: string | null; readonly left: number; readonly top: number };

  const pseudoNode = (
    el: Element,
    parentKey: string,
    side: '::before' | '::after',
  ): MeasuredNode | null => {
    const style = getComputedStyle(el, side);
    const content = style.content;
    if (content === 'none' || content === 'normal' || content === '""' || content === "''") {
      return null;
    }
    /* Рамки у псевдоэлемента браузер не отдаёт: записываем размер из
       вычисленных `width`/`height`, если они в px, иначе нули. */
    const size = (value: string): number => {
      const number = Number.parseFloat(value);
      return Number.isNaN(number) ? 0 : round(number);
    };
    return {
      key: `${parentKey}${side}`,
      parent: parentKey,
      fixed: false,
      x: 0,
      y: 0,
      w: size(style.width),
      h: size(style.height),
      geometry: geometryOf(style, false),
      palette: paletteOf(style, false, false),
    };
  };

  const visit = (el: Element, frame: Frame): void => {
    if (SKIP_TAGS.has(el.tagName)) return;
    const style = getComputedStyle(el);
    if (style.display === 'none') return;

    const cls = moduleClass(el);
    const text = ownText(el);
    const tag = el.tagName.toLowerCase();
    const isMedia = tag === 'img' || tag === 'svg';
    const record =
      style.visibility !== 'hidden' &&
      (cls !== null || el.matches(INTERACTIVE) || text !== '' || isMedia);

    let nextFrame = frame;
    if (record) {
      const rect = el.getBoundingClientRect();
      const fixed = style.position === 'fixed' || style.position === 'sticky';
      const left = rect.left + (fixed ? 0 : window.scrollX);
      const top = rect.top + (fixed ? 0 : window.scrollY);
      const role = el.getAttribute('role');
      const base = cls !== null ? `${tag}.${cls}` : role !== null ? `${tag}[role=${role}]` : tag;
      const key = uniqueKey(frame.key, base);
      const hasBorder = [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ].some((width) => Number.parseFloat(width) > 0);
      const clipped =
        /hidden|clip/.test(`${style.overflowX} ${style.overflowY}`) &&
        (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);

      const node: Mutable<MeasuredNode> = {
        key,
        parent: frame.key,
        fixed,
        x: round(fixed ? left : left - frame.left),
        y: round(fixed ? top : top - frame.top),
        w: round(rect.width),
        h: round(rect.height),
        geometry: geometryOf(style, text !== ''),
        palette: paletteOf(style, text !== '', hasBorder),
      };
      if (text !== '') {
        node.text = text.slice(0, TEXT_LIMIT);
        node.lines = ownLines(el);
      }
      if (clipped) node.clipped = true;
      nodes.push(node);

      const before = pseudoNode(el, key, '::before');
      if (before !== null) nodes.push(before);

      nextFrame = { key, left, top };
      /* У `fixed` координаты детей всё равно считаются от его рамки в
         документе — иначе они «поехали» бы вместе с прокруткой. */
      if (fixed) {
        nextFrame = { key, left: rect.left + window.scrollX, top: rect.top + window.scrollY };
      }
    }

    /* Внутрь `svg` не идём: контуры не имеют смысла как узлы раскладки. */
    if (tag !== 'svg') {
      for (const child of el.children) visit(child, nextFrame);
    }

    if (record) {
      const after = pseudoNode(el, nextFrame.key ?? '', '::after');
      if (after !== null) nodes.push(after);
    }
  };

  await document.fonts.ready;

  const root = document.getElementById('storybook-root') ?? document.body;
  for (const child of root.children) visit(child, { key: null, left: 0, top: 0 });

  const fonts = new Set<string>();
  document.fonts.forEach((face) => {
    if (face.status === 'loaded') {
      fonts.add(`${face.family.replace(/^["']|["']$/g, '')} ${face.weight}`);
    }
  });

  const storyId = new URLSearchParams(window.location.search).get('id') ?? '';

  return {
    story: storyId,
    width: input.width,
    theme: input.theme,
    document: {
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    },
    fonts: [...fonts].sort((a, b) => a.localeCompare(b)),
    nodes,
  };
}
