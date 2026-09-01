import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { KnownDefect } from './known-defects';
import {
  describeViolations,
  emptyInvariantsTally,
  invariantsFileName,
  recordViolations,
  writeInvariantsOutcome,
} from './outcome';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * 🔴 Список дефектов подставляется, а не берётся настоящий. Проверяется
 * механизм — «известный дефект уходит в допущенные с причиной», — а он не
 * зависит от того, какие дефекты сегодня открыты. Первая редакция ссылалась
 * на живую запись, и тест ломался ровно тогда, когда эту запись снимал PR с
 * починкой: чинишь дефект — падает тест про механизм.
 */
const ДЕФЕКТЫ: readonly KnownDefect[] = [
  {
    rule: 'target-size',
    element: /^a\._edit_/,
    reason: 'issue #0 — ссылка списка ниже минимума AA',
  },
  {
    rule: 'target-size',
    story: /^админка-календарь/,
    element: /^button\._chip_/,
    reason: 'issue #0 — чип календаря ниже минимума AA',
  },
];

describe('известные дефекты компонентов', () => {
  it('нарушение по известному дефекту уходит в допущенные с причиной issue', () => {
    const tally = emptyInvariantsTally();
    recordViolations(
      tally,
      'админка-каталог--базовое',
      [
        {
          rule: 'target-size',
          element: 'a._edit_91hse_20 «Править»',
          detail: '54×22 при минимуме 24',
          allowed: null,
        },
        {
          rule: 'target-size',
          element: 'button._primary_1a2b3_4 «Отправить»',
          detail: '20×20 при минимуме 24',
          allowed: null,
        },
      ],
      ДЕФЕКТЫ,
    );
    expect(tally.allowed.map((item) => item.reason)).toEqual([expect.stringContaining('issue #0')]);
    expect(tally.violations.map((item) => item.element)).toEqual([
      'button._primary_1a2b3_4 «Отправить»',
    ]);
  });

  it('дефект с префиксом истории не действует на чужую историю', () => {
    const tally = emptyInvariantsTally();
    recordViolations(
      tally,
      'блоки-цены--basic',
      [
        {
          rule: 'target-size',
          element: 'button._chip_x_1 «Офис»',
          detail: '23×44 при минимуме 24',
          allowed: null,
        },
      ],
      ДЕФЕКТЫ,
    );
    expect(tally.allowed).toEqual([]);
    expect(tally.violations).toHaveLength(1);
  });
});

describe('recordViolations', () => {
  it('нарушение красит, допущение с причиной — перечисляется отдельно', () => {
    const tally = emptyInvariantsTally();
    recordViolations(tally, 'блоки-цены--basic', [
      {
        rule: 'target-size',
        element: 'button.Chip__root «Все»',
        detail: '18×18 при минимуме 44',
        allowed: null,
      },
      {
        rule: 'overflow-x',
        element: '',
        detail: 'scrollWidth 571 > 375',
        allowed: 'issue #12 — лента шире экрана намеренно',
      },
    ]);
    recordViolations(tally, 'блоки-подвал--basic', []);

    expect(tally.stories).toBe(2);
    expect(tally.violations).toEqual([
      {
        story: 'блоки-цены--basic',
        rule: 'target-size',
        element: 'button.Chip__root «Все»',
        detail: '18×18 при минимуме 44',
      },
    ]);
    expect(tally.allowed).toEqual([
      {
        story: 'блоки-цены--basic',
        rule: 'overflow-x',
        reason: 'issue #12 — лента шире экрана намеренно',
      },
    ]);
  });
});

describe('describeViolations', () => {
  it('перечисляет нарушения и отказы читаемыми строками', () => {
    const tally = emptyInvariantsTally();
    recordViolations(tally, 'x--y', [
      { rule: 'theme', element: 'body', detail: 'светлота 0.98 в тёмной теме', allowed: null },
    ]);
    tally.failed.push({ story: 'x--z', reason: 'сценарий истории отказал' });

    expect(describeViolations(tally)).toEqual([
      'x--y · theme · body: светлота 0.98 в тёмной теме',
      'x--z · отказ: сценарий истории отказал',
    ]);
  });
});

describe('правила-политики', () => {
  it('политика записана в итог, но тест ею не красится', () => {
    const tally = emptyInvariantsTally();
    recordViolations(tally, 'ui-kit-chip--basic', [
      {
        rule: 'target-size-touch',
        element: 'button.Chip__root «Все»',
        detail: '32×32 при минимуме 44',
        allowed: null,
      },
      {
        rule: 'target-size',
        element: 'a.Pager__number «2»',
        detail: '22×20 при минимуме 24',
        allowed: null,
      },
    ]);

    expect(tally.violations.map((item) => item.rule)).toEqual(['target-size-touch', 'target-size']);
    expect(describeViolations(tally)).toEqual([
      'ui-kit-chip--basic · target-size · a.Pager__number «2»: 22×20 при минимуме 24',
    ]);
  });
});

describe('файл итога', () => {
  it('имя содержит группу, долю, ширину и тему; без доли — короче', () => {
    expect(invariantsFileName('public', 375, 'dark')).toBe('invariants-public-375-dark.json');
    expect(invariantsFileName('panel', 1440, 'light', { index: 2, total: 4 })).toBe(
      'invariants-panel-s2of4-1440-light.json',
    );
  });

  it('пишет полную форму итога в каталог, создавая его', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'inv-')), 'вложенный');
    dirs.push(dir);
    const path = writeInvariantsOutcome(
      dir,
      {
        group: 'public',
        width: 320,
        theme: 'light',
        stories: 3,
        violations: [{ story: 'a', rule: 'images', element: 'img', detail: 'naturalWidth 0' }],
        allowed: [],
        failed: [],
      },
      { index: 1, total: 4 },
    );
    expect(path.endsWith('invariants-public-s1of4-320-light.json')).toBe(true);
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    expect(parsed).toEqual({
      group: 'public',
      width: 320,
      theme: 'light',
      stories: 3,
      violations: [{ story: 'a', rule: 'images', element: 'img', detail: 'naturalWidth 0' }],
      allowed: [],
      failed: [],
    });
  });
});
