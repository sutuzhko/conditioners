#!/usr/bin/env node
/**
 * Ревизор разметки: находит задачи, у которых оси нарушены
 * (issue #704, план `docs/plan-issue-labels-taxonomy.md`).
 *
 * 🔴 GitHub не умеет «ровно одна `часть/`» — он не мешает поставить две или
 * ни одной. Без ревизора правило остаётся пожеланием: восемь задач без
 * единого ярлыка накопились именно так.
 *
 * Запуск:
 *   node scripts/labels-audit.mjs              → открытые задачи с нарушенной разметкой
 *   node scripts/labels-audit.mjs --state all  → включая закрытые
 */
import { execFile } from 'node:child_process';
import { parseArgs, promisify } from 'node:util';

import { checkAxes } from './labels.mjs';

const run = promisify(execFile);

/** Задачи с проблемами: `[{ number, title, problems }]`. */
export function auditIssues(issues) {
  return issues
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      problems: checkAxes(issue.labels.map((label) => label.name)),
    }))
    .filter((issue) => issue.problems.length > 0);
}

async function main() {
  const { values } = parseArgs({ options: { state: { type: 'string', default: 'open' } } });
  const { stdout } = await run('gh', [
    'issue',
    'list',
    '--state',
    values.state,
    '--limit',
    '500',
    '--json',
    'number,title,labels',
  ]);

  const broken = auditIssues(JSON.parse(stdout));
  if (broken.length === 0) {
    console.log('разметка в порядке');
    return;
  }
  for (const issue of broken) {
    console.log(`#${issue.number} ${issue.title}`);
    for (const problem of issue.problems) console.log(`    ${problem}`);
  }
  console.log(`\nзадач с нарушенной разметкой: ${broken.length}`);
  process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('labels-audit.mjs')) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
