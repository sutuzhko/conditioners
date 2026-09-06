#!/usr/bin/env node
/**
 * Приводит ярлыки репозитория к словарю `scripts/labels.mjs`
 * (issue #696, план `docs/plan-issue-labels-taxonomy.md`).
 *
 * 🔴 По умолчанию скрипт ничего не меняет, а печатает, что сделал бы.
 * Он трогает разметку всего репозитория разом, и случайный запуск не должен
 * ничего стоить: правки идут только по `--apply`.
 *
 * 🔴 Удаление отделено от применения флагом `--prune`. Ярлык, снесённый с
 * 88 задач, обратно не возвращается — GitHub не хранит историю снятой
 * разметки, и восстанавливать пришлось бы руками по памяти.
 *
 * Запуск:
 *   node scripts/labels-sync.mjs                 → что изменится, ничего не делая
 *   node scripts/labels-sync.mjs --apply         → завести и поправить
 *   node scripts/labels-sync.mjs --apply --prune → ещё и удалить лишние
 */
import { execFile } from 'node:child_process';
import { parseArgs } from 'node:util';
import { promisify } from 'node:util';

import { LABELS } from './labels.mjs';

const run = promisify(execFile);

/** Цвет от GitHub приходит без решётки и в разном регистре. */
const normalizeColor = (color) =>
  String(color ?? '')
    .replace(/^#/, '')
    .toUpperCase();

/**
 * Что нужно сделать, чтобы существующие ярлыки совпали со словарём.
 *
 * Чистая функция: сравнение отделено от вызовов `gh`, потому что проверять
 * надо именно решение, а не умение дёргать сеть.
 */
export function planSync(existing, dictionary) {
  const byName = new Map(existing.map((label) => [label.name, label]));
  const create = [];
  const update = [];

  for (const [name, wanted] of Object.entries(dictionary)) {
    const current = byName.get(name);
    if (!current) {
      create.push({ name, color: wanted.color, description: wanted.description });
      continue;
    }
    const colorChanged = normalizeColor(current.color) !== normalizeColor(wanted.color);
    const textChanged = (current.description ?? '') !== wanted.description;
    if (colorChanged || textChanged) {
      update.push({ name, color: wanted.color, description: wanted.description });
    }
  }

  const remove = existing
    .map((label) => label.name)
    .filter((name) => !(name in dictionary))
    .sort();

  return { create, update, remove };
}

async function listLabels() {
  const { stdout } = await run('gh', [
    'label',
    'list',
    '--limit',
    '200',
    '--json',
    'name,color,description',
  ]);
  return JSON.parse(stdout);
}

async function main() {
  const { values } = parseArgs({
    options: { apply: { type: 'boolean' }, prune: { type: 'boolean' } },
  });

  const plan = planSync(await listLabels(), LABELS);
  const total = plan.create.length + plan.update.length + (values.prune ? plan.remove.length : 0);

  if (total === 0) {
    console.log('изменений нет');
    return;
  }

  for (const label of plan.create) console.log(`завести  ${label.name}`);
  for (const label of plan.update) console.log(`поправить ${label.name}`);
  for (const name of plan.remove) {
    console.log(values.prune ? `удалить  ${name}` : `лишний   ${name} (удалит --prune)`);
  }

  if (!values.apply) {
    console.log(`\nничего не сделано: запуск без --apply. Изменений было бы ${total}`);
    return;
  }

  for (const label of [...plan.create, ...plan.update]) {
    await run('gh', [
      'label',
      'create',
      label.name,
      '--color',
      label.color,
      '--description',
      label.description,
      '--force',
    ]);
  }
  if (values.prune) {
    for (const name of plan.remove) await run('gh', ['label', 'delete', name, '--yes']);
  }
  console.log(`\nприменено изменений: ${total}`);
}

if (process.argv[1] && process.argv[1].endsWith('labels-sync.mjs')) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
