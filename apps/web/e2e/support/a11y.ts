/**
 * Замеры доступности на живой публичной странице: контраст, видимое кольцо
 * фокуса и порядок обхода (issue #286).
 *
 * 🔴 Зачем отдельно от `shared/styles/contrast.test.ts`. Та проверка считает
 * пары токенов и умеет только сплошные цвета. Половина того, что обещано
 * PRD, — текст на градиентной заливке первого экрана, подписи на `--lead-grad`,
 * залипшая колонка таблицы сравнения: там краски складываются слоями, и
 * итоговое отношение видно только там, где браузер уже всё смешал. Ровно та же
 * причина, по которой у панели есть `scripts/admin-contrast.mjs`.
 *
 * 🔴 Градиент считается по худшей остановке. Точный цвет пикселя под буквой из
 * JS не достать, а вот утверждение «текст проходит порог против каждой краски
 * градиента» проверяемо и строже фактического: если оно верно, оно верно и в
 * любой точке заливки.
 *
 * 🔴 Все функции самодостаточны — их сериализует `page.evaluate`.
 */

export type ContrastFinding = {
  readonly element: string;
  readonly text: string;
  readonly ratio: number;
  readonly required: number;
  readonly ink: string;
  readonly background: string;
  /** «градиент» — фон сложен из остановок заливки, «слой» — из сплошных подложек. */
  readonly source: string;
  readonly fontSize: number;
  readonly bold: boolean;
};

export type ContrastReport = {
  readonly checked: number;
  /** Наименьшее отношение среди проверенных узлов; `null` — мерить было нечего. */
  readonly worst: number | null;
  /** Узлы, у которых подложку не удалось свести к цвету: они не проверены, и это видно. */
  readonly unmeasured: readonly string[];
  readonly findings: readonly ContrastFinding[];
};

export function measureContrast(): ContrastReport {
  type Rgb = { r: number; g: number; b: number; a: number };

  /** Порог AA для обычного текста (WCAG 1.4.3). */
  const AA_TEXT = 4.5;
  /** Порог AA для крупного текста и нетекстовых границ (WCAG 1.4.3, 1.4.11). */
  const AA_LARGE = 3;

  const text = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  const describe = (el: Element): string => {
    const tag = el.tagName.toLowerCase();
    const cls = el.classList.length > 0 ? `.${el.classList[0]}` : '';
    return `${tag}${cls}`;
  };

  const alphaOf = (raw: string | undefined): number =>
    raw === undefined ? 1 : raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw);

  /**
   * 🔴 Две записи, а не одна. `color-mix()` браузер приводит не к `rgb()`, а к
   * `color(srgb 1 1 1 / 0.8)` — доли вместо байтов. Пока разбиралась только
   * первая, восемь подписей бегущей строки первого экрана уходили в «не
   * измерено» молча: они как раз и красятся через `color-mix`.
   */
  const parse = (value: string): Rgb | null => {
    const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(
      value,
    );
    if (rgb !== null) {
      return {
        r: Number(rgb[1]),
        g: Number(rgb[2]),
        b: Number(rgb[3]),
        a: alphaOf(rgb[4]),
      };
    }
    const srgb =
      /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(value);
    if (srgb !== null) {
      return {
        r: Number(srgb[1]) * 255,
        g: Number(srgb[2]) * 255,
        b: Number(srgb[3]) * 255,
        a: alphaOf(srgb[4]),
      };
    }
    return null;
  };

  const over = (top: Rgb, bottom: Rgb): Rgb => {
    const a = top.a + bottom.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (t: number, b: number): number => (t * top.a + b * bottom.a * (1 - top.a)) / a;
    return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
  };

  const luminance = (c: Rgb): number => {
    const channel = (v: number): number => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  };

  const ratio = (a: Rgb, b: Rgb): number => {
    const first = luminance(a);
    const second = luminance(b);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  };

  const show = (c: Rgb): string => `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)})`;

  /* Остановки градиента: из `background-image` вынимаются все цвета в записи
     `rgb(…)`/`rgba(…)` — браузер приводит к ним и именованные, и hex. */
  const gradientStops = (image: string): readonly Rgb[] => {
    if (!image.includes('gradient(')) return [];
    const stops: Rgb[] = [];
    for (const match of image.matchAll(/rgba?\([^)]*\)/g)) {
      const parsed = parse(match[0]);
      if (parsed !== null && parsed.a > 0) stops.push(parsed);
    }
    return stops;
  };

  const WHITE: Rgb = { r: 255, g: 255, b: 255, a: 1 };

  /** Заливка узла обрезана по буквам — фон рисуется только внутри глифов. */
  const clipsToText = (style: CSSStyleDeclaration): boolean =>
    style.getPropertyValue('background-clip') === 'text' ||
    style.getPropertyValue('-webkit-background-clip') === 'text';

  /**
   * Подложки под узлом: сплошной стек снизу вверх плюс по одному варианту на
   * каждую краску градиента. Обход идёт вверх до первого непрозрачного слоя.
   *
   * 🔴 Годится только непрозрачный результат. Пока в счёт шло всё подряд,
   * плашка `rgba(34 211 238 / 10%)` над градиентом первого экрана считалась
   * фоном «rgb(34 211 238)» — и давала 1:1 против собственной краски текста.
   * Нарушения там нет: под плашкой тёмный градиент, и настоящая подложка
   * получается только после подстановки его остановок. Если ни один вариант к
   * непрозрачности не сошёлся, узел уходит в «не измерено»: молчаливое
   * «наверное, белый» — это выдуманное число.
   */
  const backgrounds = (
    from: Element | null,
  ): { readonly colors: readonly Rgb[]; readonly source: string } => {
    const layers: { color: Rgb; gradient: readonly Rgb[] }[] = [];
    let opaque = false;
    for (let node: Element | null = from; node !== null; node = node.parentElement) {
      const style = getComputedStyle(node);
      /* Заливка, обрезанная по буквам, фоном соседнему тексту не служит. */
      const gradient = clipsToText(style) ? [] : gradientStops(style.backgroundImage);
      const color = parse(style.backgroundColor) ?? { r: 0, g: 0, b: 0, a: 0 };
      if (color.a > 0 || gradient.length > 0) layers.push({ color, gradient });
      if (color.a >= 1 || gradient.some((stop) => stop.a >= 1)) {
        opaque = true;
        break;
      }
    }
    /* Дна нет — рисует браузер, и рисует он белым. */
    const base: Rgb = opaque ? { r: 0, g: 0, b: 0, a: 0 } : WHITE;

    /* Складывает стек снизу вверх, подставляя в слой `swap` краску `stop`
       вместо его собственного цвета: так получается вариант «текст стоит над
       этой остановкой градиента». */
    const compose = (swap: number, stop: Rgb | null): Rgb => {
      let acc = base;
      for (let index = layers.length - 1; index >= 0; index -= 1) {
        const layer = layers[index];
        if (layer === undefined) continue;
        acc = over(index === swap && stop !== null ? stop : layer.color, acc);
      }
      return acc;
    };

    const colors: Rgb[] = [compose(-1, null)];
    let hasGradient = false;
    for (const [index, layer] of layers.entries()) {
      for (const stop of layer.gradient) {
        hasGradient = true;
        colors.push(compose(index, stop));
      }
    }

    return {
      colors: colors.filter((c) => c.a >= 0.99),
      source: hasGradient ? 'градиент' : 'слой',
    };
  };

  /**
   * Краски текста, залитого градиентом (`background-clip: text`).
   *
   * Такой заголовок красится не свойством `color`, и по стилям его отношение
   * не считалось вовсе — а это ровно заголовок первого экрана, названный в
   * issue #286 первым. Красками текста здесь служат остановки заливки, а
   * подложкой — стек над тем узлом, который заливку несёт.
   */
  const paintedByGradient = (
    el: Element,
  ): { readonly inks: readonly Rgb[]; readonly under: Element | null } | null => {
    for (let node: Element | null = el; node !== null; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (!clipsToText(style)) continue;
      const stops = gradientStops(style.backgroundImage);
      if (stops.length === 0) return null;
      return { inks: stops, under: node.parentElement };
    }
    return null;
  };

  const hasOwnText = (el: Element): boolean =>
    Array.from(el.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && text(node.textContent).length > 0,
    );

  const opacityOf = (el: Element): number => {
    let acc = 1;
    for (let node: Element | null = el; node !== null; node = node.parentElement) {
      acc *= Number(getComputedStyle(node).opacity);
    }
    return acc;
  };

  /* Узел скрыт, если так считает браузер, если он изъят из дерева
     доступности или если он вынесен за левый край документа. Последнее — не
     педантизм: поле-ловушка форм спрятано именно так (`left: -10000px`), и
     без этой строки измеритель нашёл бы на главной «текст цвета фона» —
     нарушение, которого человек не видит и увидеть не может. */
  const visible = (el: Element): boolean => {
    if (
      typeof el.checkVisibility === 'function' &&
      !el.checkVisibility({
        contentVisibilityAuto: true,
        opacityProperty: true,
        visibilityProperty: true,
      })
    ) {
      return false;
    }
    for (let node: Element | null = el; node !== null; node = node.parentElement) {
      if (node.getAttribute('aria-hidden') === 'true') return false;
    }
    const rect = el.getBoundingClientRect();
    if (rect.right + window.scrollX < 0 || rect.bottom + window.scrollY < 0) return false;
    return rect.width > 1 && rect.height > 1;
  };

  /* Выключенные и гаснущие узлы выведены из 1.4.3 явно. */
  const MIN_ALPHA = 0.9;

  const findings: ContrastFinding[] = [];
  const unmeasured = new Set<string>();
  let checked = 0;
  let worst: number | null = null;

  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    if (!hasOwnText(el) || !visible(el)) continue;
    const style = getComputedStyle(el);
    if (opacityOf(el) < MIN_ALPHA) continue;

    /* Текст залит градиентом: красками служат остановки заливки, подложкой —
       стек над тем узлом, который заливку несёт. */
    const painted =
      style.getPropertyValue('-webkit-text-fill-color') === 'rgba(0, 0, 0, 0)'
        ? paintedByGradient(el)
        : null;

    if (
      style.getPropertyValue('-webkit-text-fill-color') === 'rgba(0, 0, 0, 0)' &&
      painted === null
    ) {
      unmeasured.add(`${describe(el)} — текст прозрачен, а заливки-градиента над ним нет`);
      continue;
    }

    const own = parse(style.color);
    const inks: readonly Rgb[] = painted === null ? (own === null ? [] : [own]) : painted.inks;
    if (inks.length === 0) {
      unmeasured.add(`${describe(el)} — цвет текста не разобран: ${style.color}`);
      continue;
    }

    const { colors, source } = backgrounds(painted === null ? el : painted.under);
    if (colors.length === 0) {
      unmeasured.add(`${describe(el)} — подложка не сошлась к непрозрачной`);
      continue;
    }

    const size = Number.parseFloat(style.fontSize);
    const weight = Number(style.fontWeight);
    const bold = weight >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const required = large ? AA_LARGE : AA_TEXT;

    /* Худшая пара из всех: каждая краска текста против каждой подложки. Для
       градиента это утверждение строже фактического — если проходит худшая
       пара, проходит и любая точка заливки. */
    let lowest = Number.POSITIVE_INFINITY;
    let against: Rgb = colors[0] ?? WHITE;
    let inkUsed: Rgb = inks[0] ?? { r: 0, g: 0, b: 0, a: 1 };
    for (const background of colors) {
      for (const ink of inks) {
        const solidInk = over(ink, background);
        const value = ratio(solidInk, background);
        if (value < lowest) {
          lowest = value;
          against = background;
          inkUsed = solidInk;
        }
      }
    }

    checked += 1;
    if (worst === null || lowest < worst) worst = lowest;
    if (lowest + 0.005 < required) {
      findings.push({
        element: describe(el),
        text: text(el.textContent).slice(0, 60),
        ratio: Math.round(lowest * 100) / 100,
        required,
        ink: show(inkUsed),
        background: show(against),
        source: painted === null ? source : 'текст залит градиентом',
        fontSize: size,
        bold,
      });
    }
  }

  return {
    checked,
    worst: worst === null ? null : Math.round(worst * 100) / 100,
    unmeasured: [...unmeasured],
    findings: findings.sort((a, b) => a.ratio - b.ratio),
  };
}

export type FocusFinding = {
  readonly element: string;
  readonly detail: string;
};

export type FocusReport = {
  readonly checked: number;
  readonly findings: readonly FocusFinding[];
};

/**
 * Видимое кольцо фокуса: узел получает фокус, и его отрисовка обязана
 * измениться. Сравниваются свойства, которыми кольцо рисуют, — обводка, тень,
 * граница, фон и цвет текста; совпадение всех пяти означает, что с клавиатуры
 * не видно, где ты находишься.
 */
export function measureFocusRing(): FocusReport {
  const INTERACTIVE = [
    'a[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const describe = (el: Element): string => {
    const tag = el.tagName.toLowerCase();
    const cls = el.classList.length > 0 ? `.${el.classList[0]}` : '';
    const name = (el.getAttribute('aria-label') ?? el.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 32);
    return name.length > 0 ? `${tag}${cls} «${name}»` : `${tag}${cls}`;
  };

  const paint = (el: Element): string => {
    const style = getComputedStyle(el);
    return [
      style.outlineStyle,
      style.outlineWidth,
      style.outlineColor,
      style.outlineOffset,
      style.boxShadow,
      style.borderColor,
      style.borderWidth,
      style.backgroundColor,
      style.color,
    ].join('|');
  };

  const visible = (el: Element): boolean => {
    if (
      typeof el.checkVisibility === 'function' &&
      !el.checkVisibility({
        contentVisibilityAuto: true,
        opacityProperty: true,
        visibilityProperty: true,
      })
    ) {
      return false;
    }
    for (let node: Element | null = el; node !== null; node = node.parentElement) {
      if (node.getAttribute('aria-hidden') === 'true') return false;
    }
    const rect = el.getBoundingClientRect();
    if (rect.right + window.scrollX < 0 || rect.bottom + window.scrollY < 0) return false;
    return rect.width > 0 && rect.height > 0;
  };

  const findings: FocusFinding[] = [];
  let checked = 0;
  const active = document.activeElement;

  for (const el of Array.from(document.querySelectorAll(INTERACTIVE))) {
    if (!(el instanceof HTMLElement) || !visible(el)) continue;
    if (el.hasAttribute('disabled')) continue;
    const before = paint(el);
    el.focus({ preventScroll: true });
    if (document.activeElement !== el) continue; // узел фокус не принимает — это не про кольцо
    const after = paint(el);
    el.blur();
    checked += 1;
    if (before === after) {
      findings.push({ element: describe(el), detail: 'отрисовка при фокусе не меняется' });
    }
  }

  if (active instanceof HTMLElement) active.focus({ preventScroll: true });

  return { checked, findings };
}

export type OrderEntry = {
  readonly element: string;
  readonly top: number;
  readonly left: number;
};

/**
 * Порядок обхода: узлы в порядке DOM с их координатами на странице.
 * Инверсии считает сам сценарий — так проще объяснить, где именно порядок
 * разошёлся с чтением.
 */
export function readTabOrder(): readonly OrderEntry[] {
  const INTERACTIVE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([type="hidden"]):not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const describe = (el: Element): string => {
    const tag = el.tagName.toLowerCase();
    const cls = el.classList.length > 0 ? `.${el.classList[0]}` : '';
    const name = (el.getAttribute('aria-label') ?? el.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 32);
    return name.length > 0 ? `${tag}${cls} «${name}»` : `${tag}${cls}`;
  };

  const hidden = (el: Element): boolean => {
    if (
      typeof el.checkVisibility === 'function' &&
      !el.checkVisibility({
        contentVisibilityAuto: true,
        opacityProperty: true,
        visibilityProperty: true,
      })
    ) {
      return true;
    }
    for (let node: Element | null = el; node !== null; node = node.parentElement) {
      if (node.getAttribute('aria-hidden') === 'true') return true;
    }
    const rect = el.getBoundingClientRect();
    return rect.right + window.scrollX < 0 || rect.bottom + window.scrollY < 0;
  };

  const entries: OrderEntry[] = [];
  for (const el of Array.from(document.querySelectorAll(INTERACTIVE))) {
    if (hidden(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    /* Закреплённые полосы стоят вне потока чтения: липкая панель действий
       живёт внизу экрана, а в DOM объявлена там, где ей удобно. Порядок
       страницы она не описывает. */
    let fixed = false;
    for (let node: Element | null = el; node !== null; node = node.parentElement) {
      const position = getComputedStyle(node).position;
      if (position === 'fixed' || position === 'sticky') {
        fixed = true;
        break;
      }
    }
    if (fixed) continue;
    entries.push({
      element: describe(el),
      top: Math.round(rect.top + window.scrollY),
      left: Math.round(rect.left + window.scrollX),
    });
  }
  return entries;
}
