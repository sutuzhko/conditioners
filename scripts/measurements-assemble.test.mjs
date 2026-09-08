import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  assemble,
  buildManifest,
  coverage,
  readPartials,
  writeFiles,
} from './measurements-assemble.mjs';

const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tmp() {
  const dir = mkdtempSync(join(tmpdir(), 'measure-partials-'));
  dirs.push(dir);
  return dir;
}

function partial(story, width, theme) {
  return {
    story,
    width,
    theme,
    document: { scrollWidth: width, scrollHeight: 900 },
    fonts: ['Onest 600'],
    nodes: [
      {
        key: 'div.Root__root',
        parent: null,
        fixed: false,
        x: 0,
        y: 0,
        w: width,
        h: 900,
        geometry: {},
        palette: { bg: '#ffffff' },
      },
    ],
  };
}

function writePartial(dir, p) {
  writeFileSync(join(dir, `measure-${p.story}--${p.width}-${p.theme}.json`), JSON.stringify(p));
}

describe('сборка измерений', () => {
  it('группирует частичные по историям и пишет файл на историю', () => {
    const dir = tmp();
    for (const story of ['блоки-а--basic', 'блоки-б--basic']) {
      for (const width of [320, 375]) {
        for (const theme of ['light', 'dark']) writePartial(dir, partial(story, width, theme));
      }
    }
    const result = assemble(readPartials(dir));
    expect(result.stories).toBe(2);
    expect([...result.files.keys()]).toEqual(['блоки-а--basic.txt', 'блоки-б--basic.txt']);
    expect(result.failed).toEqual([]);

    const out = tmp();
    writeFiles(result.files, out);
    expect(readdirSync(out).sort()).toEqual(['блоки-а--basic.txt', 'блоки-б--basic.txt']);
    expect(readFileSync(join(out, 'блоки-а--basic.txt'), 'utf8')).toContain(
      '# блоки-а--basic · ширины 320 375',
    );
  });

  it('🔴 история без полного набора пар не пишется и уходит в отказы', () => {
    const dir = tmp();
    writePartial(dir, partial('блоки-а--basic', 320, 'light'));
    writePartial(dir, partial('блоки-а--basic', 320, 'dark'));
    writePartial(dir, partial('блоки-а--basic', 375, 'light')); // 375/dark не дошла
    const result = assemble(readPartials(dir));
    expect(result.files.size).toBe(0);
    expect(result.failed).toEqual([
      { story: 'блоки-а--basic', reason: 'нет измерений для 375/dark' },
    ]);
  });

  it('читает отказы раннера и нечитаемые файлы как отказы', () => {
    const dir = tmp();
    writeFileSync(
      join(dir, 'measure-failed-public-s1of4-320-light.json'),
      JSON.stringify({ failed: [{ story: 'блоки-в--basic', reason: 'сценарий отказал' }] }),
    );
    writeFileSync(join(dir, 'measure-блоки-г--basic--320-light.json'), '{ не json');
    const result = assemble(readPartials(dir));
    expect(result.failed.map((f) => f.story)).toEqual([
      'блоки-в--basic',
      'measure-блоки-г--basic--320-light.json',
    ]);
  });

  it('каталога нет — измерений нет, и это не исключение', () => {
    expect(readPartials('/нет/такого/каталога')).toEqual({
      partials: [],
      failed: [],
      skipped: [],
      ledger: [],
      runners: [],
    });
  });

  it('🔴 список пропущенных не читается как измерение и не уходит в отказы', () => {
    const dir = mkdtempSync(join(tmpdir(), 'measure-skipped-'));
    try {
      const plan = { widths: [390], themes: ['light', 'dark'] };
      writeFileSync(
        join(dir, 'measure-skipped-panel-s1of4-390-light.json'),
        JSON.stringify({
          group: 'panel',
          width: 390,
          theme: 'light',
          shard: 1,
          shards: 4,
          plan,
          skipped: ['кит-кнопка--базовое', 'сайт-цены--базовое'],
        }),
      );
      writeFileSync(
        join(dir, 'measure-skipped-panel-s1of4-390-dark.json'),
        JSON.stringify({
          group: 'panel',
          width: 390,
          theme: 'dark',
          shard: 1,
          shards: 4,
          plan,
          skipped: ['кит-кнопка--базовое'],
        }),
      );

      const read = readPartials(dir);
      expect(read.failed, 'пропуск — не отказ').toEqual([]);
      expect(read.partials, 'пропуск — не измерение').toEqual([]);
      // Одна история пропускается на каждой паре «ширина + тема», а в отчёте
      // нужна один раз.
      expect(read.skipped).toEqual(['кит-кнопка--базовое', 'сайт-цены--базовое']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('🔴 паспорт замера называет измеренное, пропущенное и полноту обхода', () => {
    const dir = tmp();
    for (const width of [320, 375]) {
      for (const theme of ['light', 'dark']) {
        writePartial(dir, partial('блоки-а--basic', width, theme));
        writeFileSync(
          join(dir, `measure-skipped-public-${width}-${theme}.json`),
          JSON.stringify({
            group: 'public',
            width,
            theme,
            shard: 1,
            shards: 1,
            plan: { widths: [320, 375], themes: ['light', 'dark'] },
            skipped: ['блоки-б--basic'],
          }),
        );
      }
    }
    const read = readPartials(dir);
    const manifest = buildManifest({ read, result: assemble(read) });

    expect(manifest.version).toBe(1);
    expect(manifest.measured).toEqual(['блоки-а--basic']);
    expect(manifest.skipped).toEqual(['блоки-б--basic']);
    expect(manifest.coverage.complete).toBe(true);
  });

  it('🔴 нечитаемый список пропущенных — отказ, а не тихий пустой список', () => {
    const dir = mkdtempSync(join(tmpdir(), 'measure-skipped-bad-'));
    try {
      writeFileSync(join(dir, 'measure-skipped-panel-390-light.json'), 'не json');
      const read = readPartials(dir);
      expect(read.skipped).toEqual([]);
      expect(read.failed.length).toBe(1);
      expect(read.failed[0].reason).toMatch(/список пропущенных не читается/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('полнота обхода (issue #865)', () => {
  const PLAN = {
    public: { widths: [320, 375, 768, 1200], themes: ['light', 'dark'] },
    panel: { widths: [390, 768, 1440], themes: ['light', 'dark'] },
  };

  const entry = (group, shard, width, theme, plan = PLAN[group]) => ({
    group,
    width,
    theme,
    shard,
    shards: 4,
    plan,
  });

  /** Полный обход: обе группы, все объявленные пары, все четыре доли. */
  function full() {
    const entries = [];
    for (const group of ['public', 'panel']) {
      for (const width of PLAN[group].widths) {
        for (const theme of PLAN[group].themes) {
          for (let shard = 1; shard <= 4; shard += 1)
            entries.push(entry(group, shard, width, theme));
        }
      }
    }
    return entries;
  }

  it('все доли отчитались по всем объявленным парам — обход полон', () => {
    const result = coverage(full());
    expect(result.complete).toBe(true);
    expect(result.shards).toBe(4);
    expect(result.pairs).toBe(56);
  });

  it('🔴 доля, не отчитавшаяся ни по одной паре, делает обход неполным', () => {
    const result = coverage(full().filter((item) => item.shard !== 3));
    expect(result.complete).toBe(false);
    expect(result.missing).toHaveLength(14);
    expect(result.missing[0]).toContain('3/4');
  });

  it('🔴 доля, оборвавшаяся на середине, тоже видна', () => {
    const result = coverage(
      full().filter(
        (item) =>
          !(
            item.group === 'panel' &&
            item.shard === 2 &&
            item.width === 768 &&
            item.theme === 'dark'
          ),
      ),
    );
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual(['panel 2/4 768/dark']);
  });

  it('🔴 пара, не дошедшая ни в одной доле, не пропадает из ожидаемого вместе со своими историями', () => {
    /* Ровно та ловушка, ради которой план объявляется, а не выводится: если
       считать ожидаемое по встреченному, ширина 1200 исчезнет из ожиданий, и
       обход объявит себя полным — а истории с тегом `vr-1200` уедут в
       удаления. */
    const result = coverage(full().filter((item) => item.width !== 1200));
    expect(result.complete).toBe(false);
    expect(result.missing).toHaveLength(8);
    expect(result.missing.every((line) => line.includes('1200/'))).toBe(true);
  });

  it('🔴 пустой артефакт — не «истории удалены», а обход, которого не было', () => {
    const result = coverage([]);
    expect(result.complete).toBe(false);
    expect(result.why).toContain('ни одной ведомости');
  });

  it('локальный прогон без шардов — одна доля, обход полон', () => {
    const plan = { widths: [320], themes: ['light', 'dark'] };
    const result = coverage([
      { group: 'public', width: 320, theme: 'light', shard: 1, shards: 1, plan },
      { group: 'public', width: 320, theme: 'dark', shard: 1, shards: 1, plan },
    ]);
    expect(result).toMatchObject({ complete: true, shards: 1, pairs: 2 });
  });

  it('ведомости, разошедшиеся в числе долей, — повод не доверять обходу', () => {
    const result = coverage([
      entry('public', 1, 320, 'light'),
      { ...entry('public', 1, 320, 'dark'), shards: 2 },
    ]);
    expect(result.complete).toBe(false);
    expect(result.why).toContain('2 и 4');
  });

  it('🔴 два разных плана у одной группы — обход не считается полным', () => {
    const result = coverage([
      entry('public', 1, 320, 'light'),
      entry('public', 1, 320, 'dark', { widths: [320], themes: ['light', 'dark'] }),
    ]);
    expect(result.complete).toBe(false);
    expect(result.why).toContain('два разных плана');
  });

  it('🔴 красный раннер отменяет полноту: он мог не дойти до целой группы', () => {
    /* Ведомости своей группы прогон пишет, а группу, до обхода не дошедшую
       (переименовали разделы витрины — `loadStories` вернул пусто), не
       называет никто: её историй нет ни в замере, ни в пропущенных. Обход
       объявил бы себя полным, а истории — ушедшими из витрины. */
    expect(coverage(full(), [{ shard: 'runner-s2', outcome: 'failure' }])).toMatchObject({
      complete: false,
      why: 'раннер отчитался отказом в долях: runner-s2',
    });
    expect(
      coverage(full(), [
        { shard: 'runner-s1', outcome: 'success' },
        { shard: 'runner-s2', outcome: 'success' },
      ]).complete,
    ).toBe(true);
  });

  it('🔴 ведомость без плана обхода — отказ сборки, а не молчаливое «полно»', () => {
    const dir = tmp();
    writeFileSync(
      join(dir, 'measure-skipped-public-s1of4-320-light.json'),
      JSON.stringify({ skipped: ['блоки-а--basic'] }),
    );
    const read = readPartials(dir);
    expect(read.skipped, 'пропущенные всё равно прочитаны').toEqual(['блоки-а--basic']);
    expect(read.ledger).toEqual([]);
    expect(read.failed[0].reason).toContain('без плана обхода');
    expect(coverage(read.ledger).complete).toBe(false);
  });
});
