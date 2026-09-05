#!/usr/bin/env node
/**
 * Группы сквозных сценариев — какие spec-файлы идут на каком раннере
 * (issue #499, план `docs/plan-e2e-ci-parallel.md`).
 *
 * 🔴 Группы явные, а не `--shard` Playwright. Встроенный шардинг режет список
 * тестов подряд по их числу, профили `desktop` и `mobile` идут друг за другом,
 * а у панели мобильный профиль пропускается целиком: первый шард получал бы
 * оболочку и состояния панели на пять минут, последние — почти пустые. Здесь
 * группы взвешены по замеру в CI (прогон 33773562671, секунды сценариев по
 * файлам и профилям): admin-shell 137, smoke 99, panel-states 67,
 * admin-layout 70, company-legal 52, empty-states 31, price-update 31,
 * review-moderation 25, lead 24, crm-search 6. Оболочка панели идёт одна:
 * её первый тест компилирует все разделы, и любой сосед делает эту группу
 * самой длинной. Каждая группа — свой раннер со своей базой и одним
 * воркером, поэтому порядок и общая база внутри группы остаются как были.
 *
 * 🔴 Файл, которого нет ни в одной группе, не идёт ни на одном раннере — и
 * выпадает из CI молча. Поэтому `checkCoverage` сверяет группы с настоящим
 * каталогом: тест vitest красит `check`, шаг сводной работы красит `e2e`.
 *
 * Запуск:
 *   node scripts/e2e-groups.mjs --group site   → пути файлов группы одной строкой
 *   node scripts/e2e-groups.mjs --check        → каждый spec ровно в одной группе
 *   node scripts/e2e-groups.mjs --list         → имена групп, по одному в строке
 */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Каталог сценариев; сюда смотрит проверка покрытия. */
export const E2E_DIR = join(ROOT, 'apps/web/e2e');

/**
 * Имя группы → имена spec-файлов без `.spec.ts`.
 *
 * Порядок групп — порядок в матрице работы; порядок файлов внутри группы
 * ничего не значит: Playwright сам сортирует файлы.
 */
export const GROUPS = Object.freeze({
  /** Публичный сайт: дымовые сценарии и реквизиты компании в футере и политике. */
  site: ['smoke', 'company-legal', 'knowledge', 'public-overflow', 'public-a11y'],
  /** Оболочка панели: навигация по всем разделам на четырёх ширинах, клавиатура. */
  shell: ['admin-shell'],
  /** Панель: состояния блоков данных и раскладка разделов по ширинам. */
  panel: ['panel-states', 'admin-layout', 'admin-tabs', 'installer-order', 'panel-access'],
  /** Сценарии до базы: заявка, отзыв, цена, пустые состояния, поиск. */
  flows: [
    'lead',
    'lead-fluid',
    'reviews-fluid',
    'review-moderation',
    'price-update',
    'row-actions',
    'empty-states',
    'crm-search',
    'orders-list',
  ],
});

const SPEC = /^(.+)\.spec\.ts$/;

/** Имена spec-файлов верхнего уровня каталога: `vr/` и `support/` не сценарии. */
export function listSpecs(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => SPEC.exec(entry.name)?.[1])
    .filter((name) => name !== undefined)
    .sort();
}

/**
 * Пути файлов группы относительно `apps/web` — так их принимает
 * `playwright test` позиционными аргументами.
 *
 * 🔴 Неизвестная группа — ошибка, а не пустой список: без аргументов
 * Playwright прогнал бы весь набор, и шард с опечаткой в имени молча шёл бы
 * десять минут вместо двух.
 */
export function specsOf(groups, name) {
  const files = groups[name];
  if (files === undefined) {
    throw new Error(`группы «${name}» нет; есть: ${Object.keys(groups).join(', ')}`);
  }
  return files.map((file) => `e2e/${file}.spec.ts`);
}

/**
 * Каждый spec-файл каталога — ровно в одной группе, и каждая запись группы —
 * файл, который есть на диске. Возвращает список проблем словами: сводка
 * печатает их как есть.
 */
export function checkCoverage(groups, specs) {
  const problems = [];
  const owners = new Map();
  for (const [group, files] of Object.entries(groups)) {
    for (const file of files) owners.set(file, [...(owners.get(file) ?? []), group]);
  }

  for (const [file, where] of owners) {
    if (where.length > 1) {
      problems.push(`${file}.spec.ts приписан дважды: ${where.join(', ')}`);
    }
    if (!specs.includes(file)) {
      problems.push(`${file}.spec.ts нет на диске, но он записан в группу ${where.join(', ')}`);
    }
  }
  for (const file of specs) {
    if (!owners.has(file)) {
      problems.push(
        `${file}.spec.ts не лежит ни в одной группе — он не пойдёт ни на одном раннере`,
      );
    }
  }

  return { ok: problems.length === 0, problems };
}

function main() {
  const { values } = parseArgs({
    options: {
      group: { type: 'string' },
      check: { type: 'boolean', default: false },
      list: { type: 'boolean', default: false },
    },
  });

  if (values.list) {
    process.stdout.write(`${Object.keys(GROUPS).join('\n')}\n`);
    return;
  }

  if (values.check) {
    if (!existsSync(E2E_DIR)) {
      console.error(`✗ каталога сценариев нет: ${E2E_DIR}`);
      process.exit(2);
    }
    const result = checkCoverage(GROUPS, listSpecs(E2E_DIR));
    for (const problem of result.problems) console.error(`::error::Группы сценариев: ${problem}`);
    if (result.ok)
      console.log(`✓ ${listSpecs(E2E_DIR).length} spec-файлов, каждый ровно в одной группе`);
    process.exit(result.ok ? 0 : 1);
  }

  if (values.group !== undefined) {
    try {
      process.stdout.write(`${specsOf(GROUPS, values.group).join(' ')}\n`);
    } catch (error) {
      console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
      process.exit(2);
    }
    return;
  }

  console.error('✗ нужен один из --group <имя>, --check, --list');
  process.exit(2);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) main();
