import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Шкала плотности панели — машиной, а не глазом.
 *
 * 🔴 Заведено потому, что схлопнуть шкалу проще всего незаметно. На доске
 * макета правило тап-зоны стояло классом-модификатором и попало заодно на
 * десктопные кадры: малая кнопка выросла с 32 до 44 и перестала отличаться
 * от средней, а круглое действие строки осталось 32 — ряд действий оказался
 * вдвое мельче соседних кнопок (ADR-183). На снимке это выглядит нормально.
 *
 * Проверяются значения токенов, а не отрисованные элементы: живую панель
 * меряет `scripts/admin-density.mjs` (issue #312), и он отвечает на другой
 * вопрос — дошли ли токены до разметки.
 */
const TOKENS = readFileSync(join(__dirname, 'tokens.css'), 'utf8');
const UI_TOKENS = readFileSync(join(__dirname, 'ui-tokens.css'), 'utf8');
const GLOBAL = readFileSync(join(__dirname, 'global.css'), 'utf8');

/** Объявления одного блока: от селектора до его закрывающей скобки. */
function block(css: string, selector: string, from = 0): Record<string, string> {
  const start = css.indexOf(selector, from);
  expect(start, `блок «${selector}» не найден`).toBeGreaterThanOrEqual(0);

  const body = css.slice(start, css.indexOf('}', start));
  const values: Record<string, string> = {};
  for (const match of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name === undefined || value === undefined) continue;
    values[name] = value.trim();
  }
  return values;
}

/** Плотность и геометрия панели живут на её контейнере, а не в `:root` (ADR-187). */
const PANEL = block(TOKENS, "[data-ui='panel']");

/** Тот же контейнер внутри сенсорного порога: до 900px высоты идут по пальцу. */
const TOUCH = block(TOKENS, "[data-ui='panel']", TOKENS.indexOf('@media (width < 900px)'));

/** Тени тёмной темы: они не наследуются, их переопределяют отдельно. */
const DARK_PANEL = block(TOKENS, ":root[data-theme='dark'] [data-ui='panel']");

const TAP = block(UI_TOKENS, ':root {')['tap'];

function pixels(value: string | undefined): number {
  expect(value, 'значение отсутствует').toBeDefined();
  return Number.parseFloat(value ?? '');
}

describe('Плотность панели', () => {
  it.each([
    'h-sm',
    'h-md',
    'h-lg',
    'h-nav',
    'r-btn',
    'r-card',
    'r-nav',
    'r-app',
    'pad-card',
    'pad-card-sm',
    'fs-label',
    'fs-body',
    'fs-tiny',
  ])('«%s» определён на контейнере панели', (token) => {
    expect(PANEL[token], `--${token} не объявлен в блоке панели`).toBeDefined();
  });

  it('шкала высот идёт ступенями по 8px и не схлопывается', () => {
    const sm = pixels(PANEL['h-sm']);
    const md = pixels(PANEL['h-md']);
    const lg = pixels(PANEL['h-lg']);

    expect(md - sm).toBe(8);
    expect(lg - md).toBe(8);
  });

  it('пункт навигации держит тап-зону: он единственная навигация панели', () => {
    expect(PANEL['h-nav']).toBe(TAP);
  });

  it('до 900px малая и средняя высоты поднимаются до тап-зоны, крупная — до 52px', () => {
    expect(TOUCH['h-sm']).toBe('var(--tap)');
    expect(TOUCH['h-md']).toBe('var(--tap)');
    expect(pixels(TOUCH['h-lg'])).toBeGreaterThanOrEqual(pixels(PANEL['h-lg']));
  });

  it('оболочка объявлена, и свёрнутая колонка уже развёрнутой', () => {
    expect(pixels(PANEL['navbar'])).toBeGreaterThan(0);
    expect(pixels(PANEL['rail'])).toBeLessThan(pixels(PANEL['aside']));
  });

  /* 🔴 Забыть тень в тёмной теме дешевле всего: светлая полупрозрачная тень
     на почти чёрном фоне не видна вовсе, и слой перестаёт отделяться — а на
     светлом снимке всё выглядит верно. */
  it.each(['sh-sm', 'sh-md', 'sh-lg'])('тень «%s» задана в обеих темах', (token) => {
    expect(PANEL[token], `--${token} не объявлен в блоке панели`).toBeDefined();
    expect(DARK_PANEL[token], `--${token} не переопределён в тёмной теме`).toBeDefined();
  });

  /* 🔴 Липкая панель вкладок лежит поверх содержимого, и отступ прокрутки под
     неё живёт в глобальных стилях: токен объявлен на контейнере панели, а
     прокручивается документ. Число там повторено — пусть расхождение ловит
     проверка, а не человек, у которого фокус уехал под панель. */
  it('отступ прокрутки под липкой панелью равен её высоте с отбивкой', () => {
    const rule = /html:has\(\[data-ui='panel'\]\)\s*\{[^}]*scroll-padding-bottom:\s*(\d+)px/.exec(
      GLOBAL,
    );

    expect(rule, 'правило отступа прокрутки не найдено в global.css').not.toBeNull();
    expect(Number(rule?.[1])).toBeGreaterThanOrEqual(pixels(PANEL['navbar']));
  });

  it('кнопка и поле идут пилюлей, а контейнеры — прямее (ADR-187)', () => {
    /* Полную пилюлю даёт любой радиус от половины высоты; самый высокий
       контрол панели — 52px в сенсорной раскладке. */
    expect(pixels(PANEL['r-btn'])).toBeGreaterThan(pixels(TOUCH['h-lg']) / 2);
    expect(pixels(PANEL['r-card'])).toBeLessThan(pixels(PANEL['r-app']));
    expect(pixels(PANEL['r-nav'])).toBeLessThan(pixels(PANEL['r-card']));
  });
});
