/**
 * Сводка инвариантов: вердикт по итогам раннера (ADR-230, фаза 3).
 *
 * 🔴 Каждая причина красного и каждая причина зелёного проверяется отдельно:
 * шлюз, который умеет «зелено, ничего не проверив», обязан быть доказан на
 * каждой ветке (ADR-221). Отдельно проверяется, что допущение с причиной не
 * красит, но остаётся видимым.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { aggregate, plural, readOutcomes, summarize } from './invariants-summary.mjs';

/** Итог одной пары «ширина + тема» в форме контракта с раннером. */
function outcome(group, width, theme, extra = {}) {
  return { group, width, theme, stories: 10, violations: [], allowed: [], failed: [], ...extra };
}

/** Полный набор одного шарда: public 4×2 и panel 3×2 — четырнадцать итогов. */
function fullShard(extraFor = () => ({})) {
  const list = [];
  for (const width of [320, 375, 768, 1200]) {
    for (const theme of ['light', 'dark'])
      list.push(outcome('public', width, theme, extraFor('public', width, theme)));
  }
  for (const width of [390, 768, 1440]) {
    for (const theme of ['light', 'dark'])
      list.push(outcome('panel', width, theme, extraFor('panel', width, theme)));
  }
  return list;
}

const violation = (story, rule, element, detail) => ({ story, rule, element, detail });

const run = (outcomes, extra = {}) => summarize({ expected: 14, outcomes, ...extra });

describe('чтение итогов', () => {
  it('каталога нет — итогов нет, и это не исключение', () => {
    expect(readOutcomes(join(tmpdir(), 'нет-такого-каталога-инварианты'))).toEqual([]);
  });

  it('читает только файлы итогов и раскладывает поля контракта', () => {
    const dir = mkdtempSync(join(tmpdir(), 'inv-'));
    writeFileSync(
      join(dir, 'invariants-public-s1of4-320-light.json'),
      JSON.stringify(outcome('public', 320, 'light', { stories: 7 })),
    );
    writeFileSync(join(dir, 'runner-s1'), 'success');
    const list = readOutcomes(dir);
    expect(list).toHaveLength(1);
    expect(list[0].stories).toBe(7);
  });

  it('🔴 нечитаемый итог становится отказом, а не пропадает молча', () => {
    const dir = mkdtempSync(join(tmpdir(), 'inv-'));
    writeFileSync(join(dir, 'invariants-public-375-dark.json'), '{не json');
    const [item] = readOutcomes(dir);
    expect(item.failed).toHaveLength(1);
    expect(item.failed[0].reason).toMatch(/итог не читается/);
  });
});

describe('сведение', () => {
  it('одно нарушение на разных парах — одна строка со всеми кадрами', () => {
    const total = aggregate([
      outcome('public', 320, 'light', {
        violations: [violation('a--b', 'target-size', 'button «Ок»', '18×18')],
      }),
      outcome('public', 320, 'dark', {
        violations: [violation('a--b', 'target-size', 'button «Ок»', '18×18')],
      }),
    ]);
    expect(total.violations).toHaveLength(1);
    expect(total.violations[0].frames).toEqual(['320/light', '320/dark']);
    expect(total.stories).toBe(20);
  });
});

describe('вердикт', () => {
  it('🔴 итогов меньше ожидаемого — красный: прогон не дошёл до конца', () => {
    const result = run(fullShard().slice(0, 13));
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/итогов 13 из 14/);
  });

  it('всё чисто — зелёный', () => {
    const result = run(fullShard());
    expect(result.ok).toBe(true);
    expect(result.markdown).toMatch(/✅ Инварианты соблюдены/);
    expect(result.markdown).toMatch(/Итогов раннера \| 14 из 14/);
  });

  it('🔴 нарушение — красный, правило и история названы с числами', () => {
    const result = run(
      fullShard((group, width) =>
        group === 'public' && width === 375
          ? {
              violations: [
                violation(
                  'блоки-цены--basic',
                  'target-size',
                  'button.Chip__root «Все»',
                  '18×18 при минимуме 44',
                ),
              ],
            }
          : {},
      ),
    );
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/2 нарушения у 1 истории/);
    expect(result.markdown).toMatch(/\| `target-size` \| 2 \| 1 \|/);
    expect(result.markdown).toMatch(
      /`блоки-цены--basic` \| 375\/light, 375\/dark \| button\.Chip__root «Все» \| 18×18 при минимуме 44/,
    );
  });

  it('допущение с причиной не красит, но перечислено', () => {
    const result = run(
      fullShard((group) =>
        group === 'panel'
          ? {
              allowed: [
                {
                  story: 'кит-лента--basic',
                  rule: 'overflow-x',
                  reason: 'issue #12 — лента шире экрана',
                },
              ],
            }
          : {},
      ),
    );
    expect(result.ok).toBe(true);
    expect(result.markdown).toMatch(/Допущено с причиной — 1 у 1 историй/);
    // по причинам, а не по историям: причина | правило | историй | кадров
    expect(result.markdown).toMatch(
      /\| issue #12 — лента шире экрана \| `overflow-x` \| 1 \| 6 \|/,
    );
  });

  it('политика 44×44 не красит, но видна отдельной таблицей и строкой шапки', () => {
    const result = run(
      fullShard((group, w) =>
        w === 390
          ? {
              violations: [
                violation(
                  'ui-kit-chip--basic',
                  'target-size-touch',
                  'button.Chip',
                  '32×32 при минимуме 44',
                ),
                violation(
                  'ui-kit-chip--sizes',
                  'target-size-touch',
                  'button.Chip',
                  '36×36 при минимуме 44',
                ),
              ],
            }
          : {},
      ),
    );
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.markdown).toMatch(
      /\| Политика 44×44 до 900px — предупреждений \| 4 у 2 историй \|/,
    );
    expect(result.markdown).toMatch(/### Политика 44×44 до 900px — предупреждения/);
    expect(result.markdown).toMatch(/`ui-kit-chip--basic` \| 2/);
    // в счётчик нарушений политика не попадает
    expect(result.markdown).toMatch(/\| Нарушений \| 0 у 0 историй \|/);
  });

  it('🔴 AA-порог 24 красит и рядом с политикой', () => {
    const result = run(
      fullShard((group, w) =>
        w === 390
          ? {
              violations: [
                violation(
                  'ui-kit-chip--basic',
                  'target-size-touch',
                  'button.Chip',
                  '32×32 при минимуме 44',
                ),
                violation(
                  'блоки-каталог--basic',
                  'target-size',
                  'a.Pager',
                  '22×20 при минимуме 24',
                ),
              ],
            }
          : {},
      ),
    );
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/2 нарушения у 1 истории/);
    expect(result.markdown).toMatch(/\| `target-size` \| 2 \| 1 \|/);
    expect(result.markdown).not.toMatch(/\| `target-size-touch` \|/);
  });

  it('🔴 отказ красит и назван с причиной', () => {
    const result = run(
      fullShard((group, width, theme) =>
        group === 'panel' && width === 1440 && theme === 'dark'
          ? { failed: [{ story: 'админка-заказы--basic', reason: 'сценарий истории отказал' }] }
          : {},
      ),
    );
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/1 отказ/);
    expect(result.markdown).toMatch(
      /`админка-заказы--basic` \| 1440\/dark \| сценарий истории отказал/,
    );
  });

  it('🔴 раннер упал, а итог этого не объясняет — красный', () => {
    const result = run(fullShard(), { runner: 'failure' });
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/раннер завершился ошибкой/);
  });

  it('раннер упал из-за нарушений — это объяснено, лишней причины нет', () => {
    const result = run(
      fullShard((group) =>
        group === 'public'
          ? { violations: [violation('x--y', 'images', 'img', 'naturalWidth 0')] }
          : {},
      ),
      { runner: 'failure' },
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toMatch(/нарушений/);
  });

  it('длинный список одного правила обрезается, остаток назван числом', () => {
    const many = Array.from({ length: 45 }, (_, i) =>
      violation(`история-${String(i).padStart(2, '0')}`, 'fonts', 'body', 'Onest не загружен'),
    );
    const result = run(
      fullShard((group, width, theme) =>
        group === 'public' && width === 320 && theme === 'light' ? { violations: many } : {},
      ),
    );
    expect(result.markdown).toMatch(/ещё 5 — полный список в итогах артефакта/);
  });
});

describe('склонение', () => {
  it('нарушение / нарушения / нарушений', () => {
    expect(plural(1, 'нарушение', 'нарушения', 'нарушений')).toBe('1 нарушение');
    expect(plural(3, 'нарушение', 'нарушения', 'нарушений')).toBe('3 нарушения');
    expect(plural(11, 'нарушение', 'нарушения', 'нарушений')).toBe('11 нарушений');
    expect(plural(22, 'нарушение', 'нарушения', 'нарушений')).toBe('22 нарушения');
  });
});
