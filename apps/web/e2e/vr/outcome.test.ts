import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  classifyError,
  emptyTally,
  firstLines,
  outcomeFileName,
  recordErrors,
  writeOutcome,
} from './outcome';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('classifyError', () => {
  it('расхождение кадра с эталоном — changed: его принимает ярлык', () => {
    /* Сообщение снято с настоящего прогона 33403324410, а не сочинено:
       первая редакция теста проверяла выдуманную строку и пропустила то,
       что признак `Screenshot comparison failed` не совпадает ни разу. */
    expect(
      classifyError(
        'Error: expect(page).toHaveScreenshot(expected) failed\n\n  4371 pixels (ratio 0.01 of all image pixels) are different.',
      ),
    ).toBe('changed');
    // разный размер кадра — тоже расхождение, а не отказ
    expect(
      classifyError(
        'Error: … failed\n\nExpected an image 375px by 900px, received 375px by 899px.',
      ),
    ).toBe('changed');
    // прежний формат сообщения других версий Playwright
    expect(classifyError('Screenshot comparison failed:')).toBe('changed');
  });

  it('таймаут устойчивого кадра — failed: это флейк, а не принятое изменение', () => {
    expect(
      classifyError(
        'Error: expect(page).toHaveScreenshot(expected) failed\n\nTimeout 20000ms exceeded.',
      ),
    ).toBe('failed');
  });

  it('отсутствующий эталон — new: истории не с чем сравниваться', () => {
    expect(
      classifyError(
        "Error: A snapshot doesn't exist at /vr/frames/stories.spec.ts-snapshots/x--375-dark-linux.png, writing actual.",
      ),
    ).toBe('new');
  });

  it('всё остальное — failed: отказ сценария ярлыком не принимается', () => {
    expect(classifyError('сценарий истории отказал — снимок сделан не с того состояния')).toBe(
      'failed',
    );
    expect(classifyError('page.goto: Timeout 30000ms exceeded.')).toBe('failed');
  });
});

describe('recordErrors', () => {
  it('раскладывает ошибки по категориям и не дублирует историю', () => {
    const tally = emptyTally();
    recordErrors(tally, 'блоки-цены--basic', [
      'Screenshot comparison failed: 12 pixels differ',
      'Screenshot comparison failed: повтор той же истории',
    ]);
    recordErrors(tally, 'блоки-цены--empty', ["A snapshot doesn't exist at …, writing actual."]);
    recordErrors(tally, 'блоки-цены--broken', [
      'page.goto: Timeout 30000ms exceeded.\n    at …\n    at …\n    at …',
    ]);

    expect(tally.changed).toEqual(['блоки-цены--basic']);
    expect(tally.new).toEqual(['блоки-цены--empty']);
    expect(tally.failed).toEqual([
      { story: 'блоки-цены--broken', reason: 'page.goto: Timeout 30000ms exceeded. at … at …' },
    ]);
  });
});

describe('firstLines', () => {
  it('снимает раскраску терминала и обрезает стек', () => {
    const coloured =
      'сценарий истории отказал \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m)\u001b[22m\n\n    at step (file.ts:1:1)\n    at run\n    at more';
    expect(firstLines(coloured)).toBe(
      'сценарий истории отказал expect(received) at step (file.ts:1:1)',
    );
  });
});

describe('writeOutcome', () => {
  it('имя файла с шардом не совпадает с именами других шардов', () => {
    expect(outcomeFileName('public', 375, 'dark')).toBe('outcome-public-375-dark.json');
    expect(outcomeFileName('public', 375, 'dark', { index: 2, total: 4 })).toBe(
      'outcome-public-s2of4-375-dark.json',
    );
  });

  it('пишет файл с именем из проекта, ширины и темы и полной формой итога', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vr-outcome-'));
    dirs.push(dir);
    const nested = join(dir, 'ещё', 'глубже');

    const path = writeOutcome(nested, {
      project: 'panel',
      width: 390,
      theme: 'light',
      compared: 2,
      changed: ['ui-kit-button--basic'],
      new: [],
      failed: [{ story: 'ui-kit-modal--opening', reason: 'сценарий истории отказал' }],
      hashes: { 'ui-kit-button--basic': 'a94a8fe5' },
      skipped: 3,
    });

    expect(path).toBe(join(nested, outcomeFileName('panel', 390, 'light')));
    expect(
      writeOutcome(
        nested,
        {
          project: 'panel',
          width: 390,
          theme: 'light',
          compared: 0,
          changed: [],
          new: [],
          failed: [],
          hashes: {},
          skipped: 0,
        },
        { index: 3, total: 4 },
      ),
    ).toBe(join(nested, 'outcome-panel-s3of4-390-light.json'));
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      project: 'panel',
      width: 390,
      theme: 'light',
      compared: 2,
      changed: ['ui-kit-button--basic'],
      new: [],
      failed: [{ story: 'ui-kit-modal--opening', reason: 'сценарий истории отказал' }],
      hashes: { 'ui-kit-button--basic': 'a94a8fe5' },
      skipped: 3,
    });
  });
});
