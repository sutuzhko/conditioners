/**
 * Измеритель инвариантов — правил, верных для любой истории (issue #454,
 * ADR-230, фаза 3 плана снимков).
 *
 * 🔴 Эталона у этих правил нет, и хранить нечего: документ не переполнен
 * вбок, у цели есть площадь, тема покрашена своей краской, текст не обрезан
 * молча, поверх кнопки никто не лежит, шрифты и картинки загрузились. Всё
 * это проект ловил измерением руками — тап-зона 0×0, документ вбок на 196px,
 * липкая полоса поверх панели, 25 «тёмных» эталонов в светлой теме — и ни
 * одному случаю не понадобился ни эталон, ни картинка. От содержимого базы
 * правила не зависят, поэтому покрывают и разделы `Админка/`, недоступные
 * пикселям (ADR-207).
 *
 * 🔴 Функция самодостаточна: `page.evaluate(measureInvariants, input)`
 * сериализует её исходник и исполняет в странице, где нет ни модульной
 * области, ни импортов. Поэтому все помощники объявлены внутри тела, а
 * снаружи — только типы.
 *
 * Пороги — из фактов проекта, не из вкуса: 24×24 по WCAG 2.5.8 (AA), 44×44 в
 * сенсорных раскладках до 900px (ADR-183, токен `--tap`); светлота фона — по
 * тому, что различает темы, а не по равенству токену `--bg`, потому что у
 * панели своя подложка (`[data-ui='panel']` в tokens.css), а класс бага один:
 * «тёмная тема отрисована в светлой».
 */

export type InvariantRule =
  'overflow-x' | 'target-size' | 'theme' | 'clipped-text' | 'occlusion' | 'fonts' | 'images';

export type Violation = {
  readonly rule: InvariantRule;
  /** «button.Button__root «Оставить отзыв»» — тег, первый класс, доступное имя до 40 знаков; '' у правил документа. */
  readonly element: string;
  /** Числа: «18×18 при минимуме 44», «scrollWidth 571 > 375», «фон rgb(255, 255, 255) при теме dark». */
  readonly detail: string;
  /**
   * Причина из `parameters.invariants.allow` для этой истории, иначе `null`.
   * Допущенные нарушения возвращаются, а не глотаются: сводка перечисляет их,
   * и допущение без причины видно как допущение без причины.
   */
  readonly allowed: string | null;
};

export type MeasureInput = {
  readonly theme: 'light' | 'dark';
  /** Сенсорная раскладка — ширина меньше 900px (ADR-183): порог цели 44 вместо 24. */
  readonly touch: boolean;
};

/** Допущение из параметров истории: правило и причина, по которой оно допущено. */
export type InvariantAllowance = {
  readonly rule: InvariantRule;
  readonly reason: string;
};

export async function measureInvariants(input: MeasureInput): Promise<readonly Violation[]> {
  type Rule =
    'overflow-x' | 'target-size' | 'theme' | 'clipped-text' | 'occlusion' | 'fonts' | 'images';
  type Found = { rule: Rule; element: string; detail: string };

  const RULES: readonly Rule[] = [
    'overflow-x',
    'target-size',
    'theme',
    'clipped-text',
    'occlusion',
    'fonts',
    'images',
  ];
  const found: Found[] = [];
  const report = (rule: Rule, element: string, detail: string): void => {
    found.push({ rule, element, detail });
  };

  /* ---------- допущения из параметров истории ---------- */

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;
  const isRule = (value: unknown): value is Rule =>
    typeof value === 'string' && RULES.some((rule) => rule === value);

  const allowances = new Map<Rule, string>();
  const parameters = window.__STORYBOOK_PREVIEW__?.currentRender?.story?.parameters;
  const invariants = isRecord(parameters) ? parameters.invariants : undefined;
  const allow = isRecord(invariants) ? invariants.allow : undefined;
  if (Array.isArray(allow)) {
    for (const item of allow) {
      if (!isRecord(item) || !isRule(item.rule)) continue;
      /* Причина обязана быть словами: допущение без причины — это выключенная
         проверка, и сводка покажет его именно так. */
      const reason =
        typeof item.reason === 'string' && item.reason.trim().length > 0
          ? item.reason.trim()
          : 'причина не названа';
      allowances.set(item.rule, reason);
    }
  }

  /* ---------- помощники ---------- */

  const text = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  const accessibleName = (el: Element): string => {
    const label = text(el.getAttribute('aria-label'));
    if (label.length > 0) return label;
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      const owner = el.labels?.[0];
      const byLabel = owner === undefined ? '' : text(owner.textContent);
      if (byLabel.length > 0) return byLabel;
      const placeholder = text(el.getAttribute('placeholder'));
      if (placeholder.length > 0) return placeholder;
    }
    if (el instanceof HTMLImageElement) return text(el.getAttribute('alt'));
    return text(el.textContent);
  };

  const describe = (el: Element | null): string => {
    if (el === null) return 'ничего';
    const tag = el.tagName.toLowerCase();
    const cls = el.classList.length > 0 ? `.${el.classList[0]}` : '';
    const name = accessibleName(el);
    const short = name.length > 40 ? `${name.slice(0, 39)}…` : name;
    return short.length > 0 ? `${tag}${cls} «${short}»` : `${tag}${cls}`;
  };

  /* Видимость — по цепочке предков: скрытый предок скрывает всё, что внутри. */
  const isVisible = (el: Element): boolean => {
    let node: Element | null = el;
    while (node !== null) {
      if (node instanceof HTMLElement && node.hidden) return false;
      if (node.getAttribute('aria-hidden') === 'true') return false;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (Number(style.opacity) === 0) return false;
      node = node.parentElement;
    }
    return true;
  };

  /* Шаблон sr-only: элемент есть в дереве и в доступности, но глазами его
     нет — `position: absolute`, точка в один пиксель, обрезка. Такой элемент
     не «видимая цель» по WCAG 2.5.8: нажимают на его подпись или он
     показывается только по фокусу. */
  const isScreenReaderOnly = (el: Element, style: CSSStyleDeclaration): boolean => {
    const rect = el.getBoundingClientRect();
    const tiny = rect.width <= 1 && rect.height <= 1;
    const clipped =
      style.overflow === 'hidden' ||
      style.clip !== 'auto' ||
      (style.clipPath !== 'none' && style.clipPath !== '');
    return style.position === 'absolute' && tiny && clipped;
  };

  const INTERACTIVE = [
    'a[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const targets = Array.from(document.querySelectorAll(INTERACTIVE)).filter((el) => {
    if (!isVisible(el)) return false;
    const style = getComputedStyle(el);
    if (style.pointerEvents === 'none') return false;
    if (isScreenReaderOnly(el, style)) return false;
    /* Ссылка в потоке текста исключена самим WCAG 2.5.8: её размер задаёт
       строка, а не дизайн. */
    if (el instanceof HTMLAnchorElement && style.display === 'inline') return false;
    return true;
  });

  const size = (value: number): number => Math.round(value * 10) / 10;

  /* ---------- 1. документ не переполнен вбок ---------- */

  /* Факт один — документ шире окна, — поэтому и запись одна: у `html` и
     `body` `scrollWidth` растёт от одного и того же выехавшего элемента, и две
     строки про одно читались бы как два нарушения. */
  const viewportWidth = window.innerWidth;
  const overflowing = [
    ['html', document.documentElement],
    ['body', document.body],
  ].find(([, node]) => node instanceof Element && node.scrollWidth > viewportWidth + 1);
  if (overflowing !== undefined && overflowing[1] instanceof Element) {
    report(
      'overflow-x',
      String(overflowing[0]),
      `scrollWidth ${overflowing[1].scrollWidth} > ${viewportWidth}`,
    );
  }

  /* ---------- 2. у цели есть площадь ---------- */

  const minimum = input.touch ? 44 : 24;
  for (const el of targets) {
    const rect = el.getBoundingClientRect();
    if (rect.width < minimum || rect.height < minimum) {
      report(
        'target-size',
        describe(el),
        `${size(rect.width)}×${size(rect.height)} при минимуме ${minimum}`,
      );
    }
  }

  /* ---------- 3. тема покрашена своей краской ---------- */

  const declared = document.documentElement.getAttribute('data-theme');
  if (declared !== input.theme) {
    report('theme', 'html', `data-theme="${declared ?? ''}" при теме ${input.theme}`);
  }

  const parseColor = (value: string): { r: number; g: number; b: number; a: number } | null => {
    const match =
      /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(value);
    if (match === null) return null;
    const alphaRaw = match[4];
    const a =
      alphaRaw === undefined
        ? 1
        : alphaRaw.endsWith('%')
          ? Number(alphaRaw.slice(0, -1)) / 100
          : Number(alphaRaw);
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a };
  };

  const luminance = (rgb: { r: number; g: number; b: number }): number => {
    const channel = (c: number): number => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  };

  /* Фон документа — у `body`; прозрачный — у `html`; прозрачный и там —
     белый, каким его рисует браузер. */
  const backgroundOf = (): { source: string; color: string } => {
    const layers: ReadonlyArray<readonly [string, Element]> = [
      ['body', document.body],
      ['html', document.documentElement],
    ];
    for (const [source, node] of layers) {
      const color = getComputedStyle(node).backgroundColor;
      const parsed = parseColor(color);
      if (parsed !== null && parsed.a > 0) return { source, color };
    }
    return { source: 'браузер', color: 'rgb(255, 255, 255)' };
  };

  const background = backgroundOf();
  const parsedBackground = parseColor(background.color);
  if (parsedBackground !== null) {
    const light = luminance(parsedBackground);
    const wrong = input.theme === 'dark' ? light >= 0.2 : light <= 0.8;
    if (wrong) {
      report(
        'theme',
        background.source,
        `фон ${background.color} (светлота ${size(light)}) при теме ${input.theme}`,
      );
    }
  }

  /* ---------- 4. текст не обрезан молча ---------- */

  const hasOwnText = (el: Element): boolean =>
    Array.from(el.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && text(node.textContent).length > 0,
    );

  const hides = (overflow: string): boolean => overflow === 'hidden' || overflow === 'clip';

  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    if (!hasOwnText(el) || !isVisible(el)) continue;
    const style = getComputedStyle(el);
    /* У строчных элементов `clientWidth` равен нулю по спецификации — там
       мерить нечего. */
    if (style.display === 'inline' || el.clientWidth === 0) continue;

    if (
      hides(style.overflowX) &&
      style.textOverflow !== 'ellipsis' &&
      el.scrollWidth > el.clientWidth + 1
    ) {
      report(
        'clipped-text',
        describe(el),
        `текст шире рамки: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}, многоточия нет`,
      );
    }

    const lineClamp = style.getPropertyValue('-webkit-line-clamp');
    if (
      hides(style.overflowY) &&
      (lineClamp === '' || lineClamp === 'none') &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      report(
        'clipped-text',
        describe(el),
        `текст выше рамки: scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}, обрезки строк нет`,
      );
    }
  }

  /* ---------- 5. поверх цели никто не лежит ---------- */

  const modal = document.querySelector('[aria-modal="true"]');
  const scrollX0 = window.scrollX;
  const scrollY0 = window.scrollY;

  const controls = (hit: Element, el: Element): boolean =>
    hit instanceof HTMLLabelElement && hit.control === el;

  for (const el of targets) {
    /* Открытое модальное окно накрывает страницу по замыслу: цели под ним
       недоступны законно, проверяются только цели внутри. */
    if (modal !== null && !modal.contains(el)) continue;

    let rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue; // это уже `target-size`

    /* Цель в первом экране проверяется там, где стоит: липкая полоса
       накрывает именно верх страницы, и прокрутка к центру спрятала бы этот
       случай. Цель ниже — подводится к центру окна. */
    const inViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= viewportWidth;
    if (!inViewport) {
      el.scrollIntoView({ block: 'center', inline: 'center' });
      rect = el.getBoundingClientRect();
    }

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (cx < 0 || cy < 0 || cx > viewportWidth || cy > window.innerHeight) continue;

    const hit = document.elementFromPoint(cx, cy);
    const ok = hit !== null && (hit === el || el.contains(hit) || controls(hit, el));
    if (!ok) {
      report(
        'occlusion',
        describe(el),
        `в точке (${Math.round(cx)}, ${Math.round(cy)}) сверху ${describe(hit)}`,
      );
    }
  }

  window.scrollTo(scrollX0, scrollY0);

  /* ---------- 6. шрифты загрузились ---------- */

  await document.fonts.ready;

  const declaredFamilies = new Set<string>();
  const faces: FontFace[] = [];
  document.fonts.forEach((face) => {
    faces.push(face);
  });
  for (const face of faces) {
    const family = face.family.replace(/^["']|["']$/g, '');
    declaredFamilies.add(family);
    if (face.status === 'error') {
      report('fonts', '', `${family} ${face.weight} ${face.style}: файл не загрузился`);
    }
  }

  /* Проверяются только семейства, объявленные через @font-face: системные
     шрифты в `document.fonts` не значатся, и для них `check` ничего не
     означает. */
  const checkedFamilies = new Set<string>();
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    if (!hasOwnText(el) || !isVisible(el)) continue;
    const style = getComputedStyle(el);
    const first =
      style.fontFamily
        .split(',')[0]
        ?.trim()
        .replace(/^["']|["']$/g, '') ?? '';
    if (first.length === 0 || !declaredFamilies.has(first)) continue;
    const key = `${style.fontWeight} ${style.fontStyle} ${first}`;
    if (checkedFamilies.has(key)) continue;
    checkedFamilies.add(key);
    const loaded = document.fonts.check(`${style.fontStyle} ${style.fontWeight} 16px "${first}"`);
    if (!loaded) {
      report(
        'fonts',
        describe(el),
        `${first} ${style.fontWeight} ${style.fontStyle}: не загружен, рисуется подмена`,
      );
    }
  }

  /* ---------- 7. картинки загрузились ---------- */

  for (const img of Array.from(document.images)) {
    if (!isVisible(img)) continue;
    /* Ленивая картинка за пределами окна ещё не начинала грузиться — это не
       поломка, а `loading="lazy"` в действии. */
    if (img.loading === 'lazy') {
      const rect = img.getBoundingClientRect();
      const offscreen = rect.bottom < 0 || rect.top > window.innerHeight;
      if (offscreen) continue;
    }
    if (!img.complete || img.naturalWidth === 0) {
      report(
        'images',
        describe(img),
        `${img.complete ? 'загружена с ошибкой' : 'не загрузилась'}: ${img.currentSrc || img.src}`,
      );
    }
  }

  return found.map((item) => ({
    rule: item.rule,
    element: item.element,
    detail: item.detail,
    allowed: allowances.get(item.rule) ?? null,
  }));
}
