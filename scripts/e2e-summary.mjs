#!/usr/bin/env node
/**
 * Сводка и вердикт работы сквозных сценариев (issue #501).
 *
 * 🔴 Вердикт выносит этот скрипт, а не код возврата Playwright в шарде — как у
 * снимков (`vr-summary.mjs`, ADR-230): группы идут на своих раннерах, и
 * сводная работа `e2e` собирает итоги всех групп и решает по ним разом.
 * Шлюз, который умеет «зелено, ничего не проверив», обязан краснеть сам:
 * работа `e2e` однажды отчиталась успехом, не запустив ни одного сценария
 * (ADR-221), поэтому группа без единого пройденного сценария — красная.
 *
 * Что читает: на группу — маркер исхода раннера `runner-<group>` и отчёт
 * JSON-репортера Playwright `report-<group>.json`. Что пишет: markdown в
 * `$GITHUB_STEP_SUMMARY` и в stdout — таблицу по группам, упавшие и flaky
 * сценарии с файлом, строкой и профилем.
 *
 * Красит работу:
 *   - у группы нет итога — шард не дошёл до конца, причина неизвестна;
 *   - есть упавшие сценарии;
 *   - раннер завершился ошибкой, которую отчёт не объясняет;
 *   - отчёт не читается при зелёном раннере;
 *   - в группе ни одного пройденного сценария;
 *   - шард упал как работа, и итоги этого не объясняют.
 * Не красит, но показывает: flaky — сценарии, прошедшие с повторной попытки.
 *
 * Запуск:
 *   node scripts/e2e-summary.mjs --outcome e2e-outcome [--runner success|failure]
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { GROUPS } from './e2e-groups.mjs';

/**
 * Итоги групп из каталога. Отсутствие маркера или отчёта — факт для вердикта,
 * а не ошибка чтения; нечитаемый отчёт помечается, а не пропадает.
 */
export function readOutcomes(dir, groups) {
  return groups.map((group) => {
    const marker = join(dir, `runner-${group}`);
    const file = join(dir, `report-${group}.json`);
    const runner = existsSync(marker) ? readFileSync(marker, 'utf8').trim() : null;
    if (!existsSync(file)) return { group, runner, report: null, unreadable: null };
    try {
      return { group, runner, report: JSON.parse(readFileSync(file, 'utf8')), unreadable: null };
    } catch (error) {
      return { group, runner, report: null, unreadable: `JSON: ${String(error)}` };
    }
  });
}

/**
 * Выжимка отчёта Playwright: числа из `stats`, упавшие и flaky — обходом
 * вложенных наборов до каждого теста с его профилем.
 */
export function digest(report) {
  const stats = report?.stats ?? {};
  const failedTests = [];
  const flakyTests = [];

  const walk = (suite) => {
    for (const item of suite?.specs ?? []) {
      for (const test of item.tests ?? []) {
        const entry = {
          file: String(item.file ?? '?'),
          line: Number(item.line) || 0,
          title: String(item.title ?? '?'),
          project: String(test.projectName ?? '?'),
        };
        if (test.status === 'unexpected') failedTests.push(entry);
        if (test.status === 'flaky') flakyTests.push(entry);
      }
    }
    for (const child of suite?.suites ?? []) walk(child);
  };
  for (const suite of report?.suites ?? []) walk(suite);

  return {
    passed: Number(stats.expected) || 0,
    skipped: Number(stats.skipped) || 0,
    flaky: Number(stats.flaky) || 0,
    failed: Number(stats.unexpected) || 0,
    duration: Number(stats.duration) || 0,
    failedTests,
    flakyTests,
    errors: (Array.isArray(report?.errors) ? report.errors : []).map((error) =>
      String(error?.message ?? error),
    ),
  };
}

/** Форма слова по числу: сценарий, сценария, сценариев — без самого числа. */
export function form(n, one, few, many) {
  const tail = n % 100;
  const last = n % 10;
  if (tail >= 11 && tail <= 19) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** Число со словом: 1 сценарий, 2 сценария, 5 сценариев. */
export function plural(n, one, few, many) {
  return `${n} ${form(n, one, few, many)}`;
}

const scenarios = (n) => plural(n, 'сценарий', 'сценария', 'сценариев');
/** Глагол согласуется с числом: «упал 1 сценарий», «упало 2 сценария». */
const fell = (n) => form(n, 'упал', 'упало', 'упало');

/** «2:05» из миллисекунд — время группы читается как на часах работы. */
export function clock(ms) {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const testLine = (test) => `${test.file}:${test.line} › ${cell(test.title)} [${test.project}]`;
const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 160);

/**
 * Вердикт и текст сводки. Чистая функция: работа даёт факты — итоги групп и
 * исход шардов как работ, — она отвечает, красить ли, почему, и что показать.
 */
export function summarize({ groups, outcomes, runner = 'success' }) {
  const reasons = [];
  const warnings = [];
  const rows = [];
  const failed = [];
  const flaky = [];
  let explained = false;

  for (const [group, files] of Object.entries(groups)) {
    const outcome = outcomes.find((item) => item.group === group);
    const sum = outcome?.report === null || outcome === undefined ? null : digest(outcome.report);
    rows.push({ group, files, sum });

    if (outcome === undefined || outcome.runner === null) {
      reasons.push(`«${group}»: итога нет — шард не дошёл до конца, причина неизвестна`);
      continue;
    }

    if (sum === null) {
      const why = outcome.unreadable ?? 'файла отчёта нет';
      reasons.push(`«${group}»: отчёт не читается (${why}), раннер — ${outcome.runner}`);
      explained = true;
      continue;
    }

    failed.push(...sum.failedTests.map((test) => ({ group, ...test })));
    flaky.push(...sum.flakyTests.map((test) => ({ group, ...test })));

    let groupExplained = false;
    if (sum.failed > 0) {
      reasons.push(`«${group}»: ${fell(sum.failed)} ${scenarios(sum.failed)}`);
      groupExplained = true;
    }
    if (sum.errors.length > 0) {
      reasons.push(`«${group}»: ошибка прогона — ${cell(sum.errors[0])}`);
      groupExplained = true;
    }
    if (sum.passed + sum.flaky === 0) {
      reasons.push(`«${group}»: ни одного пройденного сценария — группа пуста или всё пропущено`);
      groupExplained = true;
    }
    if (outcome.runner !== 'success' && !groupExplained) {
      reasons.push(
        `«${group}»: раннер завершился ошибкой, которую итог не объясняет — смотрите журнал шарда`,
      );
      groupExplained = true;
    }
    if (sum.flaky > 0) {
      warnings.push(`«${group}»: ${sum.flaky} flaky — прошли с повторной попытки`);
    }
    explained = explained || groupExplained;
  }

  if (runner !== 'success' && !explained) {
    reasons.push(
      'шард завершился ошибкой как работа, и итоги этого не объясняют — смотрите журнал шарда',
    );
  }

  /* «Прошло» — с первой попытки; flaky считается отдельно и в заголовке, и в
     таблице: ретраи прячут нестабильность, и сводка обязана её показывать. */
  const total = rows.reduce(
    (acc, row) => {
      if (row.sum === null) return acc;
      acc.passed += row.sum.passed;
      acc.flaky += row.sum.flaky;
      acc.failed += row.sum.failed;
      return acc;
    },
    { passed: 0, flaky: 0, failed: 0 },
  );

  const lines = [];
  const shakyNote = total.flaky > 0 ? `, ${total.flaky} flaky` : '';
  lines.push(
    `## Сквозные сценарии: ${scenarios(total.passed)} прошло${shakyNote}, ${fell(total.failed)} ${total.failed}`,
    '',
  );
  lines.push('| Группа | Файлы | Прошло | Пропущено | Flaky | Упало | Время |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const row of rows) {
    const files = row.files.join(', ');
    if (row.sum === null) {
      lines.push(`| \`${row.group}\` | ${files} | — | — | — | — | итога нет |`);
      continue;
    }
    const { passed, skipped, flaky: shaky, failed: broken, duration } = row.sum;
    lines.push(
      `| \`${row.group}\` | ${files} | ${passed} | ${skipped} | ${shaky} | ${broken} | ${clock(duration)} |`,
    );
  }
  lines.push('');

  if (failed.length > 0) {
    lines.push('### Упавшие сценарии — трассы в артефакте `e2e-trace-<группа>`', '');
    for (const test of failed) lines.push(`- \`${test.group}\` · ${testLine(test)}`);
    lines.push('');
  }

  if (flaky.length > 0) {
    lines.push('### Flaky — прошли с повторной попытки', '');
    for (const test of flaky) lines.push(`- \`${test.group}\` · ${testLine(test)}`);
    lines.push('');
  }

  if (reasons.length === 0) {
    lines.push('✅ Сквозные сценарии прошли во всех группах.');
  } else {
    lines.push('🔴 Работа красная:', '', ...reasons.map((reason) => `- ${reason}`));
  }
  if (warnings.length > 0) {
    lines.push('', ...warnings.map((warning) => `⚠️ ${warning}`));
  }

  return { ok: reasons.length === 0, reasons, warnings, markdown: `${lines.join('\n')}\n` };
}

function main() {
  const { values } = parseArgs({
    options: {
      outcome: { type: 'string' },
      runner: { type: 'string', default: 'success' },
    },
  });

  if (values.outcome === undefined) {
    console.error('✗ не задан --outcome');
    process.exit(2);
  }

  const groups = Object.keys(GROUPS);
  const result = summarize({
    groups: GROUPS,
    runner: values.runner,
    outcomes: readOutcomes(values.outcome, groups),
  });

  process.stdout.write(result.markdown);
  if (process.env.GITHUB_STEP_SUMMARY !== undefined) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.markdown);
  }
  for (const warning of result.warnings) console.error(`::warning::Сквозные сценарии: ${warning}`);
  for (const reason of result.reasons) console.error(`::error::Сквозные сценарии: ${reason}`);
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) main();
