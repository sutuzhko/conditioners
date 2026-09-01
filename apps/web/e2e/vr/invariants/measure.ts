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
  | 'overflow-x'
  | 'target-size'
  | 'target-size-touch'
  | 'theme'
  | 'clipped-text'
  | 'occlusion'
  | 'fonts'
  | 'images';

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
    | 'overflow-x'
    | 'target-size'
    | 'target-size-touch'
    | 'theme'
    | 'clipped-text'
    | 'occlusion'
    | 'fonts'
    | 'images';
  type Found = { rule: Rule; element: string; detail: string };

  const RULES: readonly Rule[] = [
    'overflow-x',
    'target-size',
    'target-size-touch',
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

  const text = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  const ownText = (el: Element): string =>
    text(
      Array.from(el.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join(' '),
    );

  /* Имя контейнера не собирается из текста потомков: у `html` оно выходило
     «@font-face {…» — весь стиль страницы одной строкой (разведка, прогон
     33468735089). Текст потомков берётся только у самих целей — кнопка со
     `<span>` внутри иначе осталась бы безымянной. */
  const accessibleName = (el: Element): string => {
    if (el === document.documentElement || el === document.body) return '';
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
    const own = ownText(el);
    if (own.length > 0) return own;
    return el.matches(INTERACTIVE) ? text(el.textContent) : '';
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

  /* Шаблон визуального скрытия (sr-only): элемент есть в дереве и в
     доступности, но глазами его нет — точка в один пиксель, `clip`, `clip-path`,
     обрезка. Такой элемент не «видимая цель» по WCAG 2.5.8 — нажимают на его
     подпись, — и не «обрезанный текст»: на разведке 4884 срабатывания
     `clipped-text` почти целиком были `span.srOnly` и `h2.srOnly`. */
  const isVisuallyHidden = (el: Element, style: CSSStyleDeclaration): boolean => {
    const rect = el.getBoundingClientRect();
    const tiny = rect.width <= 1 && rect.height <= 1;
    if (style.position === 'absolute' && tiny) return true;
    if (/^rect\(\s*0(?:px)?[ ,]+0(?:px)?[ ,]+0(?:px)?[ ,]+0(?:px)?\s*\)$/.test(style.clip)) {
      return true;
    }
    if (/^inset\(\s*50%\s*\)$/.test(style.clipPath)) return true;
    /* Точка в потоке с `overflow: hidden`, но без `position: absolute` — не
       шаблон скрытия, а схлопнувшийся контрол: тап-зона 0×0 выглядела ровно
       так, и её обязано ловить `target-size`. */
    return false;
  };

  const targets = Array.from(document.querySelectorAll(INTERACTIVE)).filter((el) => {
    if (!isVisible(el)) return false;
    const style = getComputedStyle(el);
    if (style.pointerEvents === 'none') return false;
    if (isVisuallyHidden(el, style)) return false;
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

  /* 🔴 Два порога — два правила (ADR-232). 24×24 — WCAG 2.2 SC 2.5.8 уровня
     AA, правило `target-size`, красит на любой ширине. 44×44 в сенсорной
     раскладке — политика проекта (DESIGN_BRIEF §9, ADR-183), правило
     `target-size-touch`: считается и показывается отдельно, но не красит.
     Второй прогон разведки дал 10 156 срабатываний порога 44 у 279 историй —
     чипы 20px, номера страниц 22×20, контролы 42px, ячейки 42×42. Это не 279
     дефектов, а состояние кита до конца редизайна («Панель · Фаза 4», «Резина
     · Фаза 9»): порог 44 — цель, к которой идут, и счётчик предупреждений
     обязан идти к нулю вместе с ней. Двойного учёта нет: цель меньше 24 даёт
     только `target-size`. */
  const AA_MINIMUM = 24;
  const TOUCH_MINIMUM = 44;

  /* Цель поля с подписью — вся подпись вместе с полем (WCAG 2.5.8: цель —
     то, по чему нажимают, а по `<label>` нажимают). На разведке ~770
     срабатываний были чекбоксы 20×20 внутри подписей шириной в строку. */
  const unite = (a: DOMRect, b: DOMRect): DOMRect =>
    new DOMRect(
      Math.min(a.left, b.left),
      Math.min(a.top, b.top),
      Math.max(a.right, b.right) - Math.min(a.left, b.left),
      Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top),
    );
  const targetRect = (el: Element): DOMRect => {
    let rect = el.getBoundingClientRect();
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      for (const label of Array.from(el.labels ?? [])) {
        if (isVisible(label)) rect = unite(rect, label.getBoundingClientRect());
      }
    }
    return rect;
  };

  const rects = new Map<Element, DOMRect>(targets.map((el) => [el, targetRect(el)]));
  const undersized = (rect: DOMRect): boolean =>
    rect.width < AA_MINIMUM || rect.height < AA_MINIMUM;
  const belowPolicy = (rect: DOMRect): boolean =>
    rect.width < TOUCH_MINIMUM || rect.height < TOUCH_MINIMUM;

  /* Исключение WCAG 2.5.8 «Spacing»: цель меньше 24×24 допустима, если
     окружность диаметром 24 с центром в её рамке не пересекает ни другую цель,
     ни окружность другой недоразмерной цели — по ней не промахнёшься в соседа.
     На разведке так выглядели номера страниц 22×20 с воздухом вокруг.
     🔴 Для порога 44 исключения нет: 44×44 в сенсорной раскладке — политика
     проекта (DESIGN_BRIEF §9, ADR-183), а не норма WCAG. */
  const distanceToRect = (cx: number, cy: number, rect: DOMRect): number => {
    const dx = Math.max(rect.left - cx, 0, cx - rect.right);
    const dy = Math.max(rect.top - cy, 0, cy - rect.bottom);
    return Math.hypot(dx, dy);
  };
  const spacedApart = (el: Element, rect: DOMRect): boolean => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (const [other, otherRect] of rects) {
      if (other === el || el.contains(other) || other.contains(el)) continue;
      if (undersized(otherRect)) {
        const ox = otherRect.left + otherRect.width / 2;
        const oy = otherRect.top + otherRect.height / 2;
        if (Math.hypot(cx - ox, cy - oy) < 24) return false;
      } else if (distanceToRect(cx, cy, otherRect) < 12) {
        return false;
      }
    }
    return true;
  };

  for (const [el, rect] of rects) {
    const dims = `${size(rect.width)}×${size(rect.height)}`;
    if (undersized(rect)) {
      /* Цель без площади нельзя нажать вовсе — воздух вокруг ей не поможет:
         так ловилась тап-зона 0×0. Исключение «Spacing» — только для целей,
         по которым в принципе можно попасть, и только вне сенсорной раскладки:
         там 44 — политика, и воздух её не заменяет. */
      const flat = rect.width === 0 || rect.height === 0;
      if (!flat && !input.touch && spacedApart(el, rect)) continue;
      report('target-size', describe(el), `${dims} при минимуме ${AA_MINIMUM}`);
      continue;
    }
    if (input.touch && belowPolicy(rect)) {
      report('target-size-touch', describe(el), `${dims} при минимуме ${TOUCH_MINIMUM}`);
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
       мерить нечего. Визуально скрытый текст обрезан по замыслу. */
    if (style.display === 'inline' || el.clientWidth === 0) continue;
    if (isVisuallyHidden(el, style)) continue;

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

  const controls = (hit: Element, el: Element): boolean =>
    hit instanceof HTMLLabelElement && hit.control === el;

  const scrolls = (overflow: string): boolean => overflow === 'auto' || overflow === 'scroll';
  const scrollableAncestors = (el: Element): HTMLElement[] => {
    const list: HTMLElement[] = [];
    for (let node = el.parentElement; node !== null; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (scrolls(style.overflowX) || scrolls(style.overflowY)) list.push(node);
    }
    return list;
  };

  /* Цель, чей центр вырезан предком с `overflow: hidden|clip` (не
     прокручиваемым), недостижима и без нас — это предмет другого правила, а
     не «накрытия». */
  const clippedByAncestor = (el: Element, cx: number, cy: number): boolean => {
    for (let node = el.parentElement; node !== null; node = node.parentElement) {
      const style = getComputedStyle(node);
      const hidesX = hides(style.overflowX) && !scrolls(style.overflowX);
      const hidesY = hides(style.overflowY) && !scrolls(style.overflowY);
      if (!hidesX && !hidesY) continue;
      const box = node.getBoundingClientRect();
      if (
        (hidesX && (cx < box.left || cx > box.right)) ||
        (hidesY && (cy < box.top || cy > box.bottom))
      ) {
        return true;
      }
    }
    return false;
  };

  type Sight = {
    readonly ok: boolean;
    readonly hit: Element | null;
    readonly cx: number;
    readonly cy: number;
  };
  const lookAt = (el: Element): Sight | null => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (cx < 0 || cy < 0 || cx > viewportWidth || cy > window.innerHeight) return null;
    const hit = document.elementFromPoint(cx, cy);
    const ok = hit !== null && (hit === el || el.contains(hit) || controls(hit, el));
    return { ok, hit, cx, cy };
  };

  /* 🔴 Две ступени. Сначала цель смотрится там, где стоит; если накрыта или
     под ней пусто — подводится к центру окна (`scrollIntoView` двигает и
     окно, и все прокручиваемые предки) и смотрится снова, а прокрутка
     возвращается. Нарушение — только то, что накрыто и после прокрутки.

     Почему так, а не «на месте»: липкая полоса поверх верха страницы ловится
     всё равно — вверх прокрутить нельзя, цель остаётся под полосой; нижняя
     закреплённая панель поверх последнего содержимого — тоже, вниз
     прокрутить нельзя (ради этого в токенах есть `--bottom-reserve`). А чип,
     уехавший за край ряда с `overflow-x: auto`, и поле под липким подвалом
     окна до прокрутки — не нарушения: до них дотягиваются прокруткой. На
     разведке (прогон 33468735089) из 2938 срабатываний почти все были именно
     такими — в точке оказывался `html`. */
  for (const el of targets) {
    /* Открытое модальное окно накрывает страницу по замыслу: цели под ним
       недоступны законно, проверяются только цели внутри. */
    if (modal !== null && !modal.contains(el)) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue; // это уже `target-size`

    const inPlace = lookAt(el);
    if (inPlace !== null && inPlace.ok) continue;
    if (clippedByAncestor(el, rect.left + rect.width / 2, rect.top + rect.height / 2)) continue;

    const ancestors = scrollableAncestors(el);
    const saved: ReadonlyArray<readonly [number, number]> = ancestors.map(
      (node): readonly [number, number] => [node.scrollLeft, node.scrollTop],
    );
    const windowX = window.scrollX;
    const windowY = window.scrollY;

    el.scrollIntoView({ block: 'center', inline: 'center' });
    const centred = lookAt(el);

    ancestors.forEach((node, index) => {
      const [left, top] = saved[index] ?? [0, 0];
      node.scrollLeft = left;
      node.scrollTop = top;
    });
    window.scrollTo(windowX, windowY);

    if (centred === null || centred.ok) continue;
    report(
      'occlusion',
      describe(el),
      `в точке (${Math.round(centred.cx)}, ${Math.round(centred.cy)}) сверху ${describe(centred.hit)}`,
    );
  }

  /* ---------- 6. шрифты загрузились ---------- */

  await document.fonts.ready;

  const facesByFamily = new Map<string, FontFace[]>();
  document.fonts.forEach((face) => {
    const family = face.family.replace(/^["']|["']$/g, '');
    facesByFamily.set(family, [...(facesByFamily.get(family) ?? []), face]);
    if (face.status === 'error') {
      report('fonts', '', `${family} ${face.weight} ${face.style}: файл не загрузился`);
    }
  });

  /* Проверяется семейство, а не начертание: браузер подменяет вес внутри
     семейства сам (нет 600 — возьмёт 700), и это не подмена шрифта. На
     разведке «Manrope 600 не загружен» стояло при объявленной грани 600 —
     проверка по весу лгала. Подмена — это когда ни одна грань семейства,
     объявленного `@font-face` и встреченного в тексте, не загрузилась после
     `document.fonts.ready`. Системные шрифты в `document.fonts` не значатся —
     для них проверки нет. */
  const checkedFamilies = new Set<string>();
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    if (!hasOwnText(el) || !isVisible(el)) continue;
    const style = getComputedStyle(el);
    const first =
      style.fontFamily
        .split(',')[0]
        ?.trim()
        .replace(/^["']|["']$/g, '') ?? '';
    const faces = facesByFamily.get(first);
    if (faces === undefined || checkedFamilies.has(first)) continue;
    checkedFamilies.add(first);
    if (!faces.some((face) => face.status === 'loaded')) {
      report('fonts', describe(el), `${first}: ни одна грань не загружена, рисуется подмена`);
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
