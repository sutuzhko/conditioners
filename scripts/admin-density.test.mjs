/**
 * Сторож одного правила на два измерителя (issue #530).
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

/** Имя правила одно на оба файла — по нему тело и находится. */
const RULE = 'const isVisuallyHidden = (';

/**
 * Тело правила из исходника: от `=> {` до парной закрывающей скобки.
 *
 * Считаем скобки, а не ищем отступ: отступ у двух файлов разный, а пар скобок
 * в теле нет вовсе — только в регулярных выражениях, где они экранированы.
 */
function ruleBody(source) {
  const at = source.indexOf(RULE);
  if (at === -1) throw new Error(`правило «${RULE}…» не найдено — оно переехало или переименовано`);

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

describe('скрытый ввод целью не считается', () => {
  const bodies = Object.fromEntries(
    Object.entries(SOURCES).map(([name, path]) => [name, ruleBody(readFileSync(path, 'utf8'))]),
  );

  /* Правило живёт в странице, а не в модуле, и импортировать его неоткуда:
     единственный способ проверить обе записи одним тестом — поднять функцию
     из её же исходника. */
  const rules = Object.entries(bodies).map(([name, body]) => [
    name,
    new Function('el', 'style', body),
  ]);

  it('правило есть в обоих измерителях и оно не пустое', () => {
    for (const [name, body] of Object.entries(bodies)) {
      expect(canon(body), name).toContain('absolute');
      expect(canon(body), name).toContain('clipPath');
    }
  });

  it('редакции правила не разошлись', () => {
    const [first, ...rest] = Object.entries(bodies);
    for (const [name, body] of rest) {
      expect(canon(body), `${name} разошёлся с ${first[0]}`).toBe(canon(first[1]));
    }
  });

  it.each(CASES)('$name', ({ el, style, hidden }) => {
    for (const [name, rule] of rules) {
      expect(rule(el, style), name).toBe(hidden);
    }
  });

  it('замер плотности правило вызывает, а не просто объявляет', () => {
    const source = readFileSync(SOURCES['admin-density.mjs'], 'utf8');
    expect(source).toContain('if (isVisuallyHidden(el, getComputedStyle(el))) continue;');
  });
});
