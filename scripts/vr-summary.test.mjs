/**
 * Сводка снимков: вердикт по итогам раннера (ADR-230).
 *
 * 🔴 Шлюз, который умеет «зелено, ничего не проверив», обязан быть доказан
 * на каждой ветке: работа `e2e` однажды отчиталась успехом, не запустив ни
 * одного сценария (ADR-221). Здесь каждая причина красного и каждая причина
 * зелёного проверяется отдельно — в том числе то, что ярлык действует только
 * на разошедшиеся кадры и не спасает отказ сценария.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { aggregate, plural, readOutcomes, summarize } from './vr-summary.mjs';

/** Итог одной пары «ширина + тема» в форме контракта с раннером. */
function outcome(width, theme, extra = {}) {
  return {
    project: 'public',
    width,
    theme,
    compared: 10,
    changed: [],
    new: [],
    failed: [],
    ...extra,
  };
}

/** Полный набор публичной работы: четыре ширины, две темы. */
function fullSet(extraFor = () => ({})) {
  const list = [];
  for (const width of [320, 375, 768, 1200]) {
    for (const theme of ['light', 'dark']) list.push(outcome(width, theme, extraFor(width, theme)));
  }
  return list;
}

function writeOutcomes(list) {
  const dir = mkdtempSync(join(tmpdir(), 'vr-outcome-'));
  for (const item of list) {
    writeFileSync(
      join(dir, `outcome-public-${item.width}-${item.theme}.json`),
      JSON.stringify(item),
    );
  }
  return dir;
}

const compare = (outcomes, extra = {}) =>
  summarize({
    project: 'public',
    mode: 'compare',
    base: 'abcdef0123456',
    expected: 8,
    outcomes,
    ...extra,
  });

describe('чтение итогов', () => {
  it('каталога нет — итогов нет, и это не исключение', () => {
    expect(readOutcomes(join(tmpdir(), 'нет-такого-каталога'))).toEqual([]);
  });

  it('читает только файлы итогов и сортирует их по имени', () => {
    const dir = writeOutcomes([outcome(375, 'dark'), outcome(320, 'light')]);
    writeFileSync(join(dir, 'посторонний.json'), '{}');
    expect(readOutcomes(dir).map((o) => `${o.width}/${o.theme}`)).toEqual([
      '320/light',
      '375/dark',
    ]);
  });

  it('🔴 нечитаемый итог становится отказом, а не пропадает молча', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vr-outcome-'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'outcome-public-375-dark.json'), '{ не json');
    const [item] = readOutcomes(dir);
    expect(item.failed).toHaveLength(1);
    expect(item.failed[0].reason).toMatch(/итог не читается/);
  });
});

describe('сведение по историям', () => {
  it('одна история — все её кадры в одной строке', () => {
    const total = aggregate([
      outcome(375, 'dark', { changed: ['блоки-цены--basic'] }),
      outcome(375, 'light', { changed: ['блоки-цены--basic'], new: ['блоки-новая--basic'] }),
    ]);
    expect(total.compared).toBe(20);
    expect(total.changed.get('блоки-цены--basic')).toEqual(['375/dark', '375/light']);
    expect(total.new.get('блоки-новая--basic')).toEqual(['375/light']);
  });
});

describe('вердикт', () => {
  it('🔴 итогов меньше ожидаемого — красный: прогон не дошёл до конца', () => {
    const result = compare([]);
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/итогов 0 из 8/);
  });

  it('все кадры совпали — зелёный', () => {
    const result = compare(fullSet());
    expect(result.ok).toBe(true);
    expect(result.markdown).toMatch(/Все кадры совпали с базой/);
    expect(result.markdown).toMatch(/80 кадров против базы `abcdef0`/);
  });

  it('разошлись без ярлыка — красный с именем истории и подсказкой про ярлык', () => {
    const result = compare(fullSet((w) => (w === 375 ? { changed: ['блоки-цены--basic'] } : {})));
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/разошлось 2 кадра у 1 истории/);
    expect(result.markdown).toMatch(/`блоки-цены--basic` \| 375\/light, 375\/dark/);
    expect(result.markdown).toMatch(/поставьте на PR ярлык `vr:accepted`/);
  });

  it('разошлись с ярлыком — зелёный, и в сводке сказано, что принято ярлыком', () => {
    const result = compare(
      fullSet((w) => (w === 375 ? { changed: ['блоки-цены--basic'] } : {})),
      {
        accepted: true,
        artifact: 'vr-diff',
      },
    );
    expect(result.ok).toBe(true);
    expect(result.markdown).toMatch(/приняты ярлыком `vr:accepted` — 2 кадра/);
    expect(result.markdown).toMatch(/в артефакте `vr-diff`/);
  });

  it('🔴 отказ сценария красит и с ярлыком', () => {
    const result = compare(
      fullSet((w, t) =>
        w === 1200 && t === 'dark'
          ? { failed: [{ story: 'блоки-отзывы--paused', reason: 'сценарий истории отказал' }] }
          : {},
      ),
      { accepted: true },
    );
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/1 отказ/);
    expect(result.markdown).toMatch(
      /`блоки-отзывы--paused` \| 1200\/dark \| сценарий истории отказал/,
    );
  });

  it('новые истории не красят и перечислены отдельно', () => {
    const result = compare(fullSet((w) => (w === 320 ? { new: ['блоки-новая--basic'] } : {})));
    expect(result.ok).toBe(true);
    expect(result.markdown).toMatch(/Новые истории — сравнивать не с чем — 1/);
    expect(result.markdown).toMatch(/`блоки-новая--basic` — 320\/light, 320\/dark/);
  });

  it('🔴 раннер упал, а итог этого не объясняет — красный', () => {
    const result = compare(fullSet(), { runner: 'failure' });
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/раннер завершился ошибкой/);
  });

  it('раннер упал из-за разошедшихся кадров — это объяснено, лишней причины нет', () => {
    const result = compare(
      fullSet((w) => (w === 375 ? { changed: ['x--y'] } : {})),
      {
        runner: 'failure',
      },
    );
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toMatch(/не приняты/);
  });

  it('отказы базы — предупреждение, а не красный', () => {
    const result = compare(fullSet(), {
      cache: 'miss',
      baseOutcomes: [outcome(375, 'dark', { failed: [{ story: 'x--y', reason: 'таймаут' }] })],
    });
    expect(result.ok).toBe(true);
    expect(result.markdown).toMatch(/⚠️ У базы `abcdef0` отказали сценарии \(1\)/);
    expect(result.markdown).toMatch(/сняты в работе — промах кеша/);
  });

  it('режим записи: зелёный без сравнения, число записанных кадров названо', () => {
    const result = summarize({
      project: 'panel',
      mode: 'record',
      base: 'fedcba9876543',
      expected: 6,
      outcomes: fullSet().slice(0, 6),
    });
    expect(result.ok).toBe(true);
    expect(result.markdown).toMatch(/кадры `fedcba9` записаны в кеш/);
    expect(result.markdown).toMatch(/Записано кадров \| 60/);
    expect(result.markdown).not.toMatch(/vr:accepted/);
  });
});

describe('склонение', () => {
  it('кадр / кадра / кадров', () => {
    expect([1, 2, 5, 11, 21, 22, 111].map((n) => plural(n, 'кадр', 'кадра', 'кадров'))).toEqual([
      '1 кадр',
      '2 кадра',
      '5 кадров',
      '11 кадров',
      '21 кадр',
      '22 кадра',
      '111 кадров',
    ]);
  });
});
