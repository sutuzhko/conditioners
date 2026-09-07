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
 *   node scripts/labels-audit.mjs --issue 42 --comment → разбор одной задачи
 *                                                        с обновлением заметки
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

/** Метка заметки ревизора: по ней она находится и заменяется, а не плодится. */
export const COMMENT_MARKER = '<!-- labels-audit -->';

/**
 * Текст заметки. Отдельной функцией, потому что проверять надо именно текст:
 * заметка обращена к человеку, и «нарушены оси» ему ничего не говорит.
 */
export function renderComment(problems) {
  return [
    COMMENT_MARKER,
    '**Разметка задачи неполная.**',
    '',
    ...problems.map((problem) => `- ${problem}`),
    '',
    'Оси и границы между ярлыками — [`docs/LABELS.md`](../blob/main/docs/LABELS.md).',
    'Обязательны ровно одна `area/` и ровно один `kind/`.',
  ].join('\n');
}

/**
 * Заметка ревизора среди комментариев задачи, если она уже есть.
 *
 * 🔴 Правка и снятие идут через GraphQL, а не REST. `gh issue view --json
 * comments` отдаёт идентификатор узла GraphQL (`IC_kwDO…`), а REST по адресу
 * `issues/comments/<id>` ждёт число — и отвечает 404 на чужой формат.
 * Ошибка выглядит как «нет прав» и стоила одного прогона на разбор.
 */
export function findComment(comments) {
  return comments.find((comment) => comment.body.startsWith(COMMENT_MARKER));
}

async function auditOne(number, shouldComment) {
  const { stdout } = await run('gh', [
    'issue',
    'view',
    String(number),
    '--json',
    'number,title,labels,comments',
  ]);
  const issue = JSON.parse(stdout);
  const [broken] = auditIssues([issue]);
  const existing = findComment(issue.comments ?? []);

  if (!broken) {
    console.log(`#${number}: разметка в порядке`);
    if (shouldComment && existing) {
      await run('gh', [
        'api',
        'graphql',
        '-f',
        'query=mutation($id: ID!) { deleteIssueComment(input: { id: $id }) { clientMutationId } }',
        '-f',
        `id=${existing.id}`,
      ]);
      console.log('прежняя заметка ревизора снята');
    }
    return;
  }

  console.log(`#${number} ${issue.title}`);
  for (const problem of broken.problems) console.log(`    ${problem}`);
  if (!shouldComment) return;

  const body = renderComment(broken.problems);
  if (existing) {
    await run('gh', [
      'api',
      'graphql',
      '-f',
      'query=mutation($id: ID!, $body: String!) { updateIssueComment(input: { id: $id, body: $body }) { clientMutationId } }',
      '-f',
      `id=${existing.id}`,
      '-f',
      `body=${body}`,
    ]);
    console.log('заметка ревизора обновлена');
  } else {
    await run('gh', ['issue', 'comment', String(number), '--body', body]);
    console.log('заметка ревизора оставлена');
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      state: { type: 'string', default: 'open' },
      issue: { type: 'string' },
      comment: { type: 'boolean' },
    },
  });

  if (values.issue) {
    await auditOne(values.issue, values.comment === true);
    return;
  }

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
