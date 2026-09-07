#!/usr/bin/env node
/**
 * Собирает `.github/labeler.yml` из словаря `scripts/labels.mjs`
 * (issue #705, план `docs/plan-issue-labels-taxonomy.md`).
 *
 * 🔴 Файл генерируется, а не пишется руками, и лежит в git — как измерения
 * раскладки (ADR-234). Две копии карты «путь → ярлык» разъехались бы в
 * первую же правку маршрутов, а расхождение видно не было бы: ярлык просто
 * перестал бы ставиться. Тест сверяет файл в git с генерацией и краснеет на
 * любом расхождении.
 *
 * Запуск:
 *   node scripts/labeler-generate.mjs         → печатает содержимое
 *   node scripts/labeler-generate.mjs --write → записывает .github/labeler.yml
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { pathMap } from './labels.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Путь к сгенерированному файлу; сюда смотрит тест. */
export const LABELER_PATH = join(ROOT, '.github/labeler.yml');

/**
 * Конфигурация `actions/labeler` v5 в виде текста.
 *
 * Пишем YAML строками, а не библиотекой: сериализация двух уровней вложения
 * не стоит парсера в зависимостях, а прочесть результат должен человек.
 */
export function renderLabeler(map) {
  const head = [
    '# Карта «путь → ярлык» для actions/labeler.',
    '#',
    '# 🔴 Файл собирается из scripts/labels.mjs командой',
    '#    node scripts/labeler-generate.mjs --write',
    '# Правки руками теряются при следующей сборке; тест сверяет файл с',
    '# генерацией и краснеет на расхождении.',
    '',
  ];
  const body = Object.entries(map).map(([label, patterns]) =>
    [
      `'${label}':`,
      '  - changed-files:',
      '      - any-glob-to-any-file:',
      ...patterns.map((pattern) => `          - '${pattern}'`),
      '',
    ].join('\n'),
  );
  return head.join('\n') + body.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('labeler-generate.mjs')) {
  const { values } = parseArgs({ options: { write: { type: 'boolean' } } });
  const text = renderLabeler(pathMap());
  if (values.write) {
    writeFileSync(LABELER_PATH, text);
    console.log(`записано: ${LABELER_PATH}`);
  } else {
    process.stdout.write(text);
  }
}
