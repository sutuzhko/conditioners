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
    expect(
      classifyError(
        'Error: expect(page).toHaveScreenshot(expected)\n\n  6 pixels (ratio 0.01 of all image pixels) are different.\nScreenshot comparison failed:',
      ),
    ).toBe('changed');
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
    });

    expect(path).toBe(join(nested, outcomeFileName('panel', 390, 'light')));
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      project: 'panel',
      width: 390,
      theme: 'light',
      compared: 2,
      changed: ['ui-kit-button--basic'],
      new: [],
      failed: [{ story: 'ui-kit-modal--opening', reason: 'сценарий истории отказал' }],
    });
  });
});
