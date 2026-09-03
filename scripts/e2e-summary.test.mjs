/**
 * Сводка сквозных сценариев: вердикт по итогам групп (issue #501).
 *
 * 🔴 Шлюз, который умеет «зелено, ничего не проверив», обязан быть доказан на
 * каждой ветке (ADR-221): работа `e2e` однажды отчиталась успехом, не
 * запустив ни одного сценария. Здесь каждая причина красного и каждая причина
 * зелёного проверяется отдельно — в том числе то, что группа без единого
 * пройденного сценария красит, а flaky остаётся виден, но не красит.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { digest, readOutcomes, summarize } from './e2e-summary.mjs';

const GROUPS = { site: ['smoke'], flows: ['lead', 'crm-search'] };

/** Тест в форме JSON-репортера Playwright: спека с одним результатом на профиль. */
function spec(file, line, title, statuses) {
  return {
    title,
    file,
    line,
    column: 7,
    ok: statuses.every((status) => status !== 'unexpected'),
    tests: statuses.map((status, index) => ({
      projectName: index === 0 ? 'desktop' : 'mobile',
      status,
      results: [],
    })),
  };
}

/** Отчёт Playwright: статистика и вложенные наборы, как пишет JSON-репортер. */
function report(specs, extra = {}) {
  const tests = specs.flatMap((item) => item.tests);
  const count = (status) => tests.filter((test) => test.status === status).length;
  return {
    suites: [
      {
        title: 'smoke.spec.ts',
        file: 'e2e/smoke.spec.ts',
        specs: [],
        suites: [{ title: 'Лендинг', file: 'e2e/smoke.spec.ts', line: 1, column: 1, specs }],
      },
    ],
    errors: [],
    stats: {
      startTime: '2026-09-03T10:00:00.000Z',
      duration: 125_000,
      expected: count('expected'),
      skipped: count('skipped'),
      unexpected: count('unexpected'),
      flaky: count('flaky'),
    },
    ...extra,
  };
}

const clean = () =>
  report([
    spec('e2e/smoke.spec.ts', 24, 'отдаётся сервером', ['expected', 'expected']),
    spec('e2e/smoke.spec.ts', 181, 'кнопка «наверх»', ['expected', 'skipped']),
  ]);

const outcome = (group, runner = 'success', json = clean()) => ({
  group,
  runner,
  report: json,
  unreadable: null,
});

const run = (outcomes, extra = {}) => summarize({ groups: GROUPS, outcomes, ...extra });

describe('чтение итогов', () => {
  it('каталога нет — у каждой группы нет ни маркера, ни отчёта', () => {
    const list = readOutcomes(join(tmpdir(), 'нет-такого-каталога-e2e'), ['site', 'flows']);
    expect(list).toEqual([
      { group: 'site', runner: null, report: null, unreadable: null },
      { group: 'flows', runner: null, report: null, unreadable: null },
    ]);
  });

  it('читает маркер раннера и отчёт группы по имени', () => {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-outcome-'));
    writeFileSync(join(dir, 'runner-site'), 'success\n');
    writeFileSync(join(dir, 'report-site.json'), JSON.stringify(clean()));
    const [site, flows] = readOutcomes(dir, ['site', 'flows']);
    expect(site.runner).toBe('success');
    expect(site.report.stats.expected).toBe(3);
    expect(flows.runner).toBeNull();
  });

  it('🔴 нечитаемый отчёт не пропадает молча, а помечается', () => {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-outcome-'));
    writeFileSync(join(dir, 'runner-site'), 'failure');
    writeFileSync(join(dir, 'report-site.json'), '{не json');
    const [site] = readOutcomes(dir, ['site']);
    expect(site.report).toBeNull();
    expect(site.unreadable).toMatch(/JSON/);
  });
});

describe('выжимка отчёта', () => {
  it('считает исходы и называет упавшие и flaky с файлом, строкой и профилем', () => {
    const json = report([
      spec('e2e/lead.spec.ts', 35, 'заявка доходит до базы', ['unexpected', 'expected']),
      spec('e2e/crm-search.spec.ts', 15, 'поиск находит', ['flaky', 'skipped']),
    ]);
    const sum = digest(json);
    expect(sum).toMatchObject({ passed: 1, skipped: 1, flaky: 1, failed: 1, duration: 125_000 });
    expect(sum.failedTests).toEqual([
      { file: 'e2e/lead.spec.ts', line: 35, title: 'заявка доходит до базы', project: 'desktop' },
    ]);
    expect(sum.flakyTests).toEqual([
      { file: 'e2e/crm-search.spec.ts', line: 15, title: 'поиск находит', project: 'desktop' },
    ]);
  });

  it('глобальные ошибки прогона читаются сообщением', () => {
    const sum = digest(report([], { errors: [{ message: 'Error: No tests found' }] }));
    expect(sum.errors).toEqual(['Error: No tests found']);
  });
});

describe('вердикт', () => {
  it('все группы зелёные — зелёный, таблица по группам с файлами и временем', () => {
    const result = run([outcome('site'), outcome('flows')]);
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.markdown).toMatch(/✅ Сквозные сценарии прошли/);
    expect(result.markdown).toMatch(/\| `site` \| smoke \| 3 \| 1 \| 0 \| 0 \| 2:05 \|/);
    expect(result.markdown).toMatch(/\| `flows` \| lead, crm-search \|/);
  });

  it('🔴 группа без итога — красный: шард не дошёл до конца', () => {
    const result = run([outcome('site')]);
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/«flows».*итога нет/);
  });

  it('🔴 упавший сценарий красит и назван с файлом, строкой и профилем', () => {
    const red = report([
      spec('e2e/lead.spec.ts', 35, 'заявка доходит до базы', ['unexpected', 'expected']),
    ]);
    const result = run([outcome('site'), outcome('flows', 'failure', red)]);
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/«flows»: упал 1 сценарий/);
    expect(result.markdown).toMatch(/e2e\/lead\.spec\.ts:35 › заявка доходит до базы \[desktop\]/);
  });

  it('🔴 раннер упал, а отчёт этого не объясняет — красный со ссылкой на журнал шарда', () => {
    const result = run([outcome('site'), outcome('flows', 'failure')]);
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(
      /«flows».*раннер завершился ошибкой, которую итог не объясняет/,
    );
  });

  it('🔴 раннер зелёный, а отчёта нет или он не читается — красный', () => {
    const result = run([
      outcome('site'),
      { group: 'flows', runner: 'success', report: null, unreadable: 'JSON: Unexpected token' },
    ]);
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/«flows».*отчёт не читается/);
  });

  it('🔴 группа без единого пройденного сценария красит: пустой список тоже зелёный у Playwright', () => {
    const empty = report([spec('e2e/smoke.spec.ts', 24, 'всё пропущено', ['skipped', 'skipped'])]);
    const result = run([outcome('site', 'success', empty), outcome('flows')]);
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/«site».*ни одного пройденного сценария/);
  });

  it('🔴 глобальная ошибка прогона красит с текстом', () => {
    const broken = report([], { errors: [{ message: 'Error: No tests found' }] });
    const result = run([outcome('site', 'failure', broken), outcome('flows')]);
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/«site».*No tests found/);
  });

  it('🔴 шард упал как работа, и итоги этого не объясняют — красный', () => {
    const result = run([outcome('site'), outcome('flows')], { runner: 'failure' });
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/шард завершился ошибкой/);
  });

  it('flaky не красит, но виден в таблице и в списке с файлом и профилем', () => {
    const shaky = report([
      spec('e2e/crm-search.spec.ts', 15, 'поиск находит', ['flaky', 'expected']),
      spec('e2e/lead.spec.ts', 35, 'заявка', ['expected', 'expected']),
    ]);
    const result = run([outcome('site'), outcome('flows', 'success', shaky)]);
    expect(result.ok).toBe(true);
    expect(result.warnings.join('\n')).toMatch(/«flows»: 1 flaky/);
    expect(result.markdown).toMatch(/\| `flows` \| lead, crm-search \| 3 \| 0 \| 1 \| 0 \|/);
    expect(result.markdown).toMatch(/### Flaky — прошли с повторной попытки/);
    expect(result.markdown).toMatch(/e2e\/crm-search\.spec\.ts:15 › поиск находит \[desktop\]/);
  });
});
