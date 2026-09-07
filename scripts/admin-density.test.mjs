/**
 * Сторож общих правил на два измерителя (issue #530, issue #548).
 *
 * 🔴 «Скрытый ввод целью не считается» записано в проекте дважды: в измерителе
 * инвариантов (`apps/web/e2e/vr/invariants/measure.ts`) и в замере плотности
 * панели (`scripts/admin-density.mjs`). Не по небрежности — обе функции
 * уезжают в страницу через `page.evaluate`, который сериализует исходник и
 * исполняет его там, где нет ни импортов, ни модульной области: общий модуль
 * туда не доедет, и это записано в шапке самого измерителя.
 *
 * Раз запись вторая неизбежна, неизбежной обязана стать и сверка. Тест берёт
 * тело правила из обоих файлов, поднимает из него функцию и прогоняет обе по
 * одной таблице случаев. Разошлись редакции — прогон красный, и разойтись
 * молча они больше не могут.
 *
 * Вторая половина теста важнее первой: она проверяет, что правило падает на
 * своём нарушении. Исключение, которое возвращает «скрыт» слишком охотно, —
 * это выключенная проверка тап-зон, и выглядит она точно так же зелено, как
 * починенная.
 *
 * 🔴 Правил под сторожем четыре, а не одно (issue #548). До этой задачи
 * измерители расходились во всём, кроме скрытого ввода: `pointer-events` и
 * строчные ссылки замер считал целями, роли `link`/`menuitem`/`option` не
 * знал вовсе, подпись к полю не засчитывал, а добор зоны псевдоэлементом
 * знал только он. Расхождения шли в обе стороны, поэтому «прошло у одного»
 * не говорило про второго ничего. Сведены и заперты здесь:
 *
 *   `INTERACTIVE`        — что вообще спрашивается на размер;
 *   `isVisuallyHidden`   — скрытый ввод целью не считается (#530);
 *   `isTarget`           — цель ли это: отключён, `pointer-events`, строчная
 *                          ссылка, `data-tap-size="essential"`;
 *   `targetBox`          — зона попадания: подпись плюс добор псевдоэлементом.
 *
 * 🔴 Осознанное различие осталось одно, и оно записано в обоих файлах:
 * видимость. Замер спрашивает «нарисован ли контрол» (`visible`), измеритель
 * — «виден ли узел человеку» (`isVisible`, обход предков ради `aria-hidden` и
 * закрытого `<details>`). Следствие названо там же: схлопнувшуюся цель 0×0
 * показывает измеритель, а не замер.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCES = {
  'admin-density.mjs': join(root, 'scripts', 'admin-density.mjs'),
  'measure.ts': join(root, 'apps', 'web', 'e2e', 'vr', 'invariants', 'measure.ts'),
};

/** Имена правил одни на оба файла — по ним тела и находятся. */
const RULES = ['isVisuallyHidden', 'isTarget', 'targetBox'];

/**
 * Тело правила из исходника: от `=> {` до парной закрывающей скобки.
 *
 * Считаем скобки, а не ищем отступ: отступ у двух файлов разный, а пар скобок
 * в теле нет вовсе — только в регулярных выражениях, где они экранированы, и
 * в объекте, который правило возвращает: он считается наравне.
 */
function ruleBody(source, rule) {
  const marker = `const ${rule} = (`;
  const at = source.indexOf(marker);
  if (at === -1)
    throw new Error(`правило «${marker}…» не найдено — оно переехало или переименовано`);

  const open = source.indexOf('{', source.indexOf('=>', at));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error('тело правила не закрылось — исходник разобран неверно');
}

/** Перечень селекторов: от `[` до парной `]`. */
function listLiteral(source, name) {
  const at = source.indexOf(`const ${name} = [`);
  if (at === -1) throw new Error(`перечень «${name}» не найден — он переехал или переименован`);

  const open = source.indexOf('[', at);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '[') depth += 1;
    if (source[i] === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error('перечень не закрылся — исходник разобран неверно');
}

/**
 * Правило, поднятое из исходника и готовое к вызову.
 *
 * 🔴 Зависимости правила собираются из того же файла, а не подсовываются
 * тестом: `isTarget` зовёт `isVisuallyHidden`, и подставить сюда чужую
 * редакцию значило бы проверять не то, что исполняется в странице.
 */
function build(source, rule, params) {
  const deps = RULES.filter((name) => name !== rule && ruleBody(source, rule).includes(`${name}(`))
    .map((name) => `const ${name} = (el, style) => {${ruleBody(source, name)}};`)
    .join('\n');
  return new Function(...params, `${deps}\n${ruleBody(source, rule)}`);
}

/**
 * Канон для сравнения: без комментариев и без разницы в переносах.
 *
 * Типов в теле нет ни у одного из двух файлов — правило работает с `el` и
 * `style`, — поэтому TypeScript и JavaScript сравниваются напрямую. Комментарии
 * снимаются нарочно: объяснять правило каждый файл вправе по-своему, расходиться
 * ему нельзя только в том, что он делает.
 */
function canon(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Узел и его стили в том виде, в каком их видит правило. */
function node({ width, height, position = 'static', clip = 'auto', clipPath = 'none' }) {
  return {
    el: { getBoundingClientRect: () => ({ width, height }) },
    style: { position, clip, clipPath },
  };
}

/**
 * Случаи, на которых правило обязано сойтись с самим собой.
 *
 * Первые три — приёмы визуального скрытия, какими их пишут в проекте и в вебе
 * вообще. Остальные — настоящие цели: правило, которое назовёт скрытым хоть
 * одну из них, снимет порог там, где по нему целятся пальцем.
 */
const CASES = [
  {
    name: 'ввод Switch: точка 1×1 с clip-path (утилита .srOnly)',
    ...node({ width: 1, height: 1, position: 'absolute', clipPath: 'inset(50%)' }),
    hidden: true,
  },
  {
    name: 'старый приём: точка 1×1 с clip: rect(0px, 0px, 0px, 0px)',
    ...node({ width: 1, height: 1, position: 'absolute', clip: 'rect(0px, 0px, 0px, 0px)' }),
    hidden: true,
  },
  {
    name: 'clip: rect(0 0 0 0) без запятых и единиц',
    ...node({ width: 12, height: 12, clip: 'rect(0 0 0 0)' }),
    hidden: true,
  },
  {
    name: 'настоящая мелкая цель: кнопка-иконка 18×18 в потоке',
    ...node({ width: 18, height: 18 }),
    hidden: false,
  },
  {
    name: 'схлопнувшийся контрол: 0×0 в потоке — это тап-зона 0×0, а не скрытие',
    ...node({ width: 0, height: 0 }),
    hidden: false,
  },
  {
    name: 'мелкая цель в абсолютном позиционировании: 20×20 — не «скрыта»',
    ...node({ width: 20, height: 20, position: 'absolute' }),
    hidden: false,
  },
  {
    name: 'дорожка Switch 34×20 — по ней и нажимают',
    ...node({ width: 34, height: 20 }),
    hidden: false,
  },
  {
    name: 'кнопка 44×44 — цель по DESIGN_BRIEF §6',
    ...node({ width: 44, height: 44 }),
    hidden: false,
  },
];

/** Исходники читаются один раз: тестов по ним много. */
const SOURCE = Object.fromEntries(
  Object.entries(SOURCES).map(([name, path]) => [name, readFileSync(path, 'utf8')]),
);

/** Редакции одного правила из обоих файлов не разошлись. */
function expectSameEdition(rule) {
  const [first, ...rest] = Object.entries(SOURCE).map(([name, source]) => [
    name,
    ruleBody(source, rule),
  ]);
  for (const [name, body] of rest) {
    expect(canon(body), `${rule}: ${name} разошёлся с ${first[0]}`).toBe(canon(first[1]));
  }
}

describe('скрытый ввод целью не считается', () => {
  /* Правило живёт в странице, а не в модуле, и импортировать его неоткуда:
     единственный способ проверить обе записи одним тестом — поднять функцию
     из её же исходника. */
  const rules = Object.entries(SOURCE).map(([name, source]) => [
    name,
    build(source, 'isVisuallyHidden', ['el', 'style']),
  ]);

  it('правило есть в обоих измерителях и оно не пустое', () => {
    for (const [name, source] of Object.entries(SOURCE)) {
      expect(canon(ruleBody(source, 'isVisuallyHidden')), name).toContain('absolute');
      expect(canon(ruleBody(source, 'isVisuallyHidden')), name).toContain('clipPath');
    }
  });

  it('редакции правила не разошлись', () => {
    expectSameEdition('isVisuallyHidden');
  });

  it.each(CASES)('$name', ({ el, style, hidden }) => {
    for (const [name, rule] of rules) {
      expect(rule(el, style), name).toBe(hidden);
    }
  });

  it('замер плотности правило вызывает, а не просто объявляет', () => {
    expect(SOURCE['admin-density.mjs']).toContain('isVisuallyHidden(el, style)');
  });
});

/**
 * Перечень целей (issue #548). Роли `link`, `menuitem` и `option` знал только
 * измеритель инвариантов: замер не спрашивал их на размер вовсе, то есть
 * пункт меню строки мог быть 20×20 и пройти замер молча.
 */
describe('перечень интерактивных целей', () => {
  it('редакции перечня не разошлись', () => {
    const [first, ...rest] = Object.entries(SOURCE).map(([name, source]) => [
      name,
      listLiteral(source, 'INTERACTIVE'),
    ]);
    for (const [name, list] of rest) {
      expect(canon(list), `INTERACTIVE: ${name} разошёлся с ${first[0]}`).toBe(canon(first[1]));
    }
  });

  it.each(['[role="link"]', '[role="menuitem"]', '[role="option"]', '[role="switch"]'])(
    'роль %s спрашивается обоими',
    (role) => {
      for (const [name, source] of Object.entries(SOURCE)) {
        expect(listLiteral(source, 'INTERACTIVE'), name).toContain(role);
      }
    },
  );
});

/** Узел с подменёнными рамкой и стилями: правила смотрят только на них. */
function element(tag, { width = 0, height = 0, x = 0, y = 0, attrs = {} } = {}) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  el.getBoundingClientRect = () => ({
    x,
    y,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
  });
  return el;
}

/** Стиль в том виде, в каком его видят правила. */
function style(extra = {}) {
  return {
    display: 'block',
    visibility: 'visible',
    position: 'static',
    clip: 'auto',
    clipPath: 'none',
    pointerEvents: 'auto',
    content: 'none',
    width: 'auto',
    height: 'auto',
    ...extra,
  };
}

/**
 * Цель ли это (issue #548).
 *
 * Половина случаев — настоящие цели: правило, ставшее слишком щедрым на
 * исключения, выключает проверку тап-зон и выглядит при этом так же зелено,
 * как починенная вёрстка.
 */
describe('цель ли это', () => {
  const rules = Object.entries(SOURCE).map(([name, source]) => [
    name,
    build(source, 'isTarget', ['el', 'style']),
  ]);

  it('редакции правила не разошлись', () => {
    expectSameEdition('isTarget');
  });

  const TARGETS = [
    {
      name: 'кнопка 40×40 — цель',
      el: () => element('button', { width: 40, height: 40 }),
      style: style(),
      target: true,
    },
    {
      name: 'отключённая кнопка — не цель: указатель она не принимает',
      el: () => element('button', { width: 40, height: 40, attrs: { disabled: '' } }),
      style: style(),
      target: false,
    },
    {
      name: 'отключённое поле — не цель',
      el: () => element('input', { width: 40, height: 40, attrs: { disabled: '' } }),
      style: style(),
      target: false,
    },
    {
      name: 'pointer-events: none — не цель: по узлу не попасть',
      el: () => element('button', { width: 40, height: 40 }),
      style: style({ pointerEvents: 'none' }),
      target: false,
    },
    {
      name: 'ссылка в потоке текста — не цель (WCAG 2.5.8 «Inline»)',
      el: () => element('a', { width: 60, height: 18, attrs: { href: '#lead' } }),
      style: style({ display: 'inline' }),
      target: false,
    },
    {
      name: 'ссылка-кнопка блоком — цель: её размер задаёт дизайн',
      el: () => element('a', { width: 120, height: 44, attrs: { href: '#lead' } }),
      style: style({ display: 'inline-flex' }),
      target: true,
    },
    {
      name: 'data-tap-size="essential" — не цель (ADR-236): размер и есть смысл',
      el: () =>
        element('div', {
          width: 12,
          height: 30,
          attrs: { role: 'button', 'data-tap-size': 'essential' },
        }),
      style: style(),
      target: false,
    },
    {
      name: 'скрытый ввод Switch — не цель: нажимают по дорожке и подписи',
      el: () => element('input', { width: 1, height: 1, attrs: { type: 'checkbox' } }),
      style: style({ position: 'absolute', clipPath: 'inset(50%)' }),
      target: false,
    },
    {
      name: 'схлопнувшаяся цель 0×0 — цель, и худшая: её обязан назвать порог',
      el: () => element('button'),
      style: style(),
      target: true,
    },
  ];

  it.each(TARGETS)('$name', ({ el, style: computed, target }) => {
    const node = el();
    for (const [name, rule] of rules) {
      expect(rule(node, computed), name).toBe(target);
    }
  });

  it('оба измерителя правило вызывают, а не просто объявляют', () => {
    expect(SOURCE['admin-density.mjs']).toContain(
      'if (!isTarget(el, getComputedStyle(el))) continue;',
    );
    expect(SOURCE['measure.ts']).toContain('isVisible(el) && isTarget(el, getComputedStyle(el))');
  });
});

/**
 * Зона попадания цели (issue #548) — то самое место, где измерители спорили
 * друг с другом громче всего: подпись знал один, псевдоэлемент — другой.
 *
 * Стили правило берёт из `getComputedStyle`, поэтому на время случая функция
 * подменяется: настоящий jsdom псевдоэлементов не считает и вернул бы пусто.
 */
describe('зона попадания цели', () => {
  const rules = Object.entries(SOURCE).map(([name, source]) => [
    name,
    build(source, 'targetBox', ['el']),
  ]);

  it('редакции правила не разошлись', () => {
    expectSameEdition('targetBox');
  });

  /** Подменяет `getComputedStyle` на время случая: правило зовёт глобальную. */
  function withStyles(styles, run) {
    const real = globalThis.getComputedStyle;
    globalThis.getComputedStyle = (node, pseudo) =>
      styles(node, pseudo ?? null) ?? style({ content: 'none' });
    try {
      return run();
    } finally {
      globalThis.getComputedStyle = real;
    }
  }

  it('галочка 24×24 в подписи 200×44 — зона это подпись целиком', () => {
    const label = element('label', { width: 200, height: 44 });
    const input = element('input', {
      width: 24,
      height: 24,
      x: 8,
      y: 10,
      attrs: { type: 'checkbox' },
    });
    label.append(input);
    document.body.append(label);

    const box = withStyles(
      (node) => (node === label ? style({ display: 'inline-block' }) : null),
      () => rules.map(([name, rule]) => [name, rule(input)]),
    );
    for (const [name, result] of box) {
      expect(`${result.width}×${result.height}`, name).toBe('200×44');
    }
    label.remove();
  });

  it('подпись скрыта — зона остаётся рамкой поля', () => {
    const label = element('label', { width: 200, height: 44 });
    const input = element('input', { width: 24, height: 24, attrs: { type: 'checkbox' } });
    label.append(input);
    document.body.append(label);

    const box = withStyles(
      (node) => (node === label ? style({ display: 'none' }) : null),
      () => rules.map(([name, rule]) => [name, rule(input)]),
    );
    for (const [name, result] of box) {
      expect(`${result.width}×${result.height}`, name).toBe('24×24');
    }
    label.remove();
  });

  it('кнопка-иконка 24×24 с добором ::after до 44 — зона 44×44', () => {
    const button = element('button', { width: 24, height: 24, x: 100, y: 100 });
    const box = withStyles(
      (node, pseudo) =>
        node === button && pseudo === '::after'
          ? style({ content: '""', position: 'absolute', width: '44px', height: '44px' })
          : null,
      () => rules.map(([name, rule]) => [name, rule(button)]),
    );
    for (const [name, result] of box) {
      expect(`${result.width}×${result.height}`, name).toBe('44×44');
      /* Зона растёт вокруг центра рамки: псевдоэлемент так и рисуется. */
      expect(result.left, name).toBe(112 - 22);
      expect(result.top, name).toBe(112 - 22);
    }
  });

  it('псевдоэлемент в потоке зону не добирает — он занимает место, а не накрывает', () => {
    const button = element('button', { width: 24, height: 24 });
    const box = withStyles(
      (node, pseudo) =>
        node === button && pseudo === '::after'
          ? style({ content: '""', position: 'static', width: '44px', height: '44px' })
          : null,
      () => rules.map(([name, rule]) => [name, rule(button)]),
    );
    for (const [name, result] of box) {
      expect(`${result.width}×${result.height}`, name).toBe('24×24');
    }
  });

  it('оба измерителя правило вызывают, а не просто объявляют', () => {
    expect(SOURCE['admin-density.mjs']).toContain('const { width, height } = targetBox(el);');
    expect(SOURCE['measure.ts']).toContain('targets.map((el) => [el, targetBox(el)])');
  });
});
