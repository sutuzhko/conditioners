/**
 * Замер горизонтального выезда с указанием виновника (issue #285).
 *
 * 🔴 Правило инвариантов `overflow-x` (`e2e/vr/invariants/measure.ts`) отвечает
 * на вопрос «шире ли документ окна» и называет `html` — этого хватало витрине,
 * где история занимает один блок и виновник очевиден. На странице целиком —
 * нет: «главная на 375 шире окна на 42px» заставляет искать по двадцати семи
 * экранам. Поэтому здесь тот же факт плюс узлы, из-за которых он случился.
 *
 * 🔴 Функция самодостаточна: `page.evaluate(measureOverflow)` сериализует её
 * исходник и исполняет в странице, где нет ни импортов, ни модульной области.
 * Помощники объявлены внутри тела, снаружи — только типы. По той же причине
 * `describe` повторяет форму имени из измерителя инвариантов, а не зовёт его:
 * поделить код между двумя сериализуемыми функциями нечем.
 */

export type OverflowCulprit = {
  /** «ul.Ticker__list «Сплит 07»» — тег, первый класс, начало текста. */
  readonly element: string;
  /** Путь от секции к узлу: «section.Hero > div.container > ul.Ticker__list». */
  readonly path: string;
  /** На сколько пикселей правый край узла выходит за правый край окна. */
  readonly beyond: number;
  /** `true` — узел закреплён и на `scrollWidth` документа не влияет: это соседний дефект. */
  readonly fixed: boolean;
};

export type OverflowReport = {
  readonly innerWidth: number;
  /** Ширина области содержимого: `innerWidth` минус вертикальная полоса прокрутки. */
  readonly clientWidth: number;
  readonly scrollWidth: number;
  /** `scrollWidth - innerWidth`: больше нуля — документ едет вбок. */
  readonly beyond: number;
  /** Высота документа — она же число бюджета высоты страницы (issue #287). */
  readonly scrollHeight: number;
  readonly culprits: readonly OverflowCulprit[];
};

export function measureOverflow(): OverflowReport {
  const root = document.documentElement;
  const innerWidth = window.innerWidth;
  const clientWidth = root.clientWidth;
  const scrollWidth = root.scrollWidth;

  const text = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  /* Имя узла: тег, первый класс и начало собственного текста. Текст потомков
     не собирается — у контейнера он выходит абзацем в сорок строк. */
  const describe = (el: Element): string => {
    const tag = el.tagName.toLowerCase();
    const cls = el.classList.length > 0 ? `.${el.classList[0]}` : '';
    const own = text(
      Array.from(el.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join(' '),
    );
    const label = own.length > 0 ? own : text(el.getAttribute('aria-label'));
    const short = label.length > 32 ? `${label.slice(0, 31)}…` : label;
    return short.length > 0 ? `${tag}${cls} «${short}»` : `${tag}${cls}`;
  };

  const shortPath = (el: Element): string => {
    const parts: string[] = [];
    for (let node: Element | null = el; node !== null; node = node.parentElement) {
      if (node === root) break;
      const tag = node.tagName.toLowerCase();
      const cls = node.classList.length > 0 ? `.${node.classList[0]}` : '';
      parts.unshift(`${tag}${cls}`);
    }
    /* Четырёх звеньев хватает, чтобы понять, в какой секции искать. */
    return parts.slice(-4).join(' > ');
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
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  };

  const rightOf = (el: Element): number => el.getBoundingClientRect().right + window.scrollX;

  /* Осознанная лента: узел выехал внутри предка, который сам помещается в окно
     и либо прокручивается, либо обрезает. Такой выезд на `scrollWidth`
     документа не влияет и дефектом не является — ровно та оговорка, ради
     которой issue #285 меряет корень, а не каждый узел. */
  const insideOwnBox = (el: Element, limit: number): boolean => {
    for (let node = el.parentElement; node !== null; node = node.parentElement) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === 'visible') continue;
      if (rightOf(node) <= limit + 1) return true;
    }
    return false;
  };

  const isFixed = (el: Element): boolean => {
    for (let node: Element | null = el; node !== null; node = node.parentElement) {
      if (getComputedStyle(node).position === 'fixed') return true;
    }
    return false;
  };

  const limit = innerWidth;
  const over = new Set<Element>();
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (!visible(el)) continue;
    if (rightOf(el) <= limit + 1) continue;
    if (insideOwnBox(el, limit)) continue;
    over.add(el);
  }

  /* Виноват лист, а не цепочка: у `html`, `body` и трёх обёрток `scrollWidth`
     растёт от одного и того же выехавшего узла, и пять строк про один факт
     читались бы как пять дефектов. */
  const leaves = [...over].filter(
    (el) => ![...over].some((other) => other !== el && el.contains(other)),
  );

  const culprits = leaves
    .map((el) => ({
      element: describe(el),
      path: shortPath(el),
      beyond: Math.round((rightOf(el) - limit) * 10) / 10,
      fixed: isFixed(el),
    }))
    .sort((a, b) => b.beyond - a.beyond)
    .slice(0, 5);

  return {
    innerWidth,
    clientWidth,
    scrollWidth,
    beyond: scrollWidth - innerWidth,
    scrollHeight: root.scrollHeight,
    culprits,
  };
}

/** Строка отказа: факт числами и виновники по именам. */
export function describeOverflow(report: OverflowReport): string {
  const head = `scrollWidth ${report.scrollWidth} > innerWidth ${report.innerWidth} (на ${report.beyond}px)`;
  if (report.culprits.length === 0) {
    return `${head}; виновный узел не найден — ищите закреплённый или обрезанный элемент`;
  }
  const lines = report.culprits.map(
    (item) =>
      `    ${item.element} выходит на ${item.beyond}px${item.fixed ? ' (закреплён, на scrollWidth не влияет)' : ''}\n` +
      `      ${item.path}`,
  );
  return `${head}\n${lines.join('\n')}`;
}
