import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { assemble, readPartials, writeFiles } from './measurements-assemble.mjs';

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
    });
  });

  it('🔴 список пропущенных не читается как измерение и не уходит в отказы', () => {
    const dir = mkdtempSync(join(tmpdir(), 'measure-skipped-'));
    try {
      writeFileSync(
        join(dir, 'measure-skipped-panel-s1of4-390-light.json'),
        JSON.stringify({ skipped: ['кит-кнопка--базовое', 'сайт-цены--базовое'] }),
      );
      writeFileSync(
        join(dir, 'measure-skipped-panel-s1of4-390-dark.json'),
        JSON.stringify({ skipped: ['кит-кнопка--базовое'] }),
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
