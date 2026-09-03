#!/usr/bin/env node
/**
 * Перечень путей, влияющих на сквозные сценарии, — шлюз и ключ содержимого
 * (issue #503, план `docs/plan-e2e-ci-parallel.md`).
 *
 * 🔴 Один перечень на два вопроса. Шлюз (ADR-221 для снимков): задевает ли
 * список изменённых файлов PR исход сценариев — если нет, работа зелёная за
 * секунды. Кеш зелёного прогона: ключ содержимого — хеш строк `git ls-tree`
 * по тем же путям, то есть по блобам проверяемого дерева, а не по списку
 * изменённого. Тот же код даёт тот же ключ, и ярлык `vr:accepted`, докоммит
 * документации и перезапуск не гоняют сценарии заново. Держать перечни
 * порознь — значит однажды получить ключ, который «не видит» правки, которую
 * шлюз видит.
 *
 * В перечне — то, что физически способно изменить исход: исходники без
 * историй и юнитов, схема и сиды, сами сценарии без `vr/`, конфиги приложения
 * и Playwright, зависимости, образ, этот пайплайн и скрипты сценариев. Вне —
 * документация, витрина, снимки и измерения, задание выкладки, состав
 * контейнеров для машины разработчика и линтеры.
 *
 * Запуск:
 *   node scripts/e2e-scope.mjs --changed < список_файлов  → true | false
 *   node scripts/e2e-scope.mjs --key                      → SHA-256 содержимого
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Пути, которые способны изменить исход сценариев. */
const AFFECTS = [
  /^apps\/web\/src\//,
  /^apps\/web\/prisma\//,
  /^apps\/web\/e2e\//,
  /^apps\/web\/public\//,
  /^apps\/web\/(next\.config\.ts|package\.json|playwright\.config\.ts|tsconfig\.json)$/,
  /^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|\.npmrc|\.nvmrc|tsconfig\.base\.json)$/,
  /^(Dockerfile|\.dockerignore)$/,
  /^\.github\/workflows\/ci\.yml$/,
  /^scripts\/e2e-[a-z-]+\.mjs$/,
];

/**
 * Исключения внутри перечня: истории и юниты лежат в `src/`, но приложение
 * их не собирает; `vr/` живёт в `e2e/`, но это снимки и измерения; тесты
 * скриптов и локальный стенд на CI не влияют.
 */
const EXCEPT = [
  /^apps\/web\/src\/.*\.(stories|test|spec)\.tsx?$/,
  /^apps\/web\/e2e\/vr\//,
  /^scripts\/e2e-[a-z-]+\.test\.mjs$/,
  /^scripts\/e2e-stand\.mjs$/,
];

/** Способен ли файл по этому пути изменить исход сценариев. */
export function affects(path) {
  if (!AFFECTS.some((rule) => rule.test(path))) return false;
  return !EXCEPT.some((rule) => rule.test(path));
}

/** Только задевающие пути из списка, в исходном порядке; пустые строки — мимо. */
export function relevant(paths) {
  return paths.filter((path) => path !== '' && affects(path));
}

/**
 * Ключ содержимого по строкам `git ls-tree -r`: режим, тип, blob и путь.
 * Считаются только задевающие пути; строки сортируются, чтобы порядок обхода
 * не влиял. Режим входит в ключ: исполняемость — тоже содержимое.
 */
export function contentKey(lines) {
  const rows = lines
    .filter((row) => row !== '')
    .filter((row) => affects(row.slice(row.indexOf('\t') + 1)))
    .sort();
  return createHash('sha256').update(rows.join('\n')).digest('hex');
}

/** Строки дерева `HEAD` без экранирования путей: кириллица в именах измерений. */
function lsTree() {
  return execFileSync('git', ['-c', 'core.quotePath=false', 'ls-tree', '-r', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).split('\n');
}

function readStdin() {
  try {
    return execFileSync('cat', [], { stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8' });
  } catch {
    return '';
  }
}

function main() {
  const { values } = parseArgs({
    options: {
      changed: { type: 'boolean', default: false },
      key: { type: 'boolean', default: false },
    },
  });

  if (values.key) {
    process.stdout.write(`${contentKey(lsTree())}\n`);
    return;
  }

  if (values.changed) {
    const hit = relevant(
      readStdin()
        .split('\n')
        .map((row) => row.trim()),
    );
    if (hit.length > 0) console.error(`Сценарии задевают:\n${hit.map((p) => `  ${p}`).join('\n')}`);
    process.stdout.write(`${hit.length > 0 ? 'true' : 'false'}\n`);
    return;
  }

  console.error('✗ нужен один из --changed (список файлов на stdin), --key');
  process.exit(2);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) main();
