#!/usr/bin/env node
/**
 * Обновление файлов измерений раскладки из артефакта работы пайплайна
 * (ADR-230, фаза 4 плана снимков, issue #462).
 *
 * 🔴 Почему артефакт, а не push из работы. Коммит, который работа сделала бы
 * токеном `GITHUB_TOKEN`, не запускает проверок: PR остаётся без вердикта на
 * последнем коммите и не вливается (так уже было с заданием «Эталоны снимков»,
 * ADR-230). Поэтому работа отдаёт обновлённые файлы артефактом
 * `measurements-updated`, а разработчик забирает их одной командой и коммитит
 * сам — своим именем, обычным push'ем, с обычным прогоном.
 *
 * Запуск (из корня или из apps/web):
 *   pnpm --filter web vr:measure:pull            — последний прогон текущей ветки
 *   pnpm --filter web vr:measure:pull <run-id>   — конкретный прогон
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ARTIFACT = 'measurements-updated';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MEASUREMENTS_DIR = join(ROOT, 'apps', 'web', 'e2e', 'vr', 'measurements');

/**
 * Синхронизация каталогов: `dest` становится копией `src` — обновлённые и
 * новые файлы записываются, файлы без пары удаляются (история переименована
 * или удалена). Возвращает, что изменилось: это и печатается пользователю.
 */
export function syncDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  const srcFiles = new Set(readdirSync(src).filter((name) => name.endsWith('.txt')));
  const destFiles = new Set(readdirSync(dest).filter((name) => name.endsWith('.txt')));
  const result = { added: [], updated: [], removed: [], unchanged: 0 };

  for (const name of [...srcFiles].sort()) {
    const text = readFileSync(join(src, name), 'utf8');
    const target = join(dest, name);
    if (!destFiles.has(name)) {
      writeFileSync(target, text, 'utf8');
      result.added.push(name);
    } else if (readFileSync(target, 'utf8') !== text) {
      writeFileSync(target, text, 'utf8');
      result.updated.push(name);
    } else {
      result.unchanged += 1;
    }
  }
  for (const name of [...destFiles].sort()) {
    if (!srcFiles.has(name)) {
      rmSync(join(dest, name));
      result.removed.push(name);
    }
  }
  return result;
}

function gh(args) {
  const run = spawnSync('gh', args, { encoding: 'utf8' });
  if (run.error !== undefined) {
    throw new Error(
      'нужен GitHub CLI: `gh` не найден. Установите его и войдите — `gh auth login` (HANDOFF).',
    );
  }
  if (run.status !== 0)
    throw new Error(`gh ${args.join(' ')} завершился с ошибкой:\n${run.stderr}`);
  return run.stdout.trim();
}

function currentBranch() {
  const run = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error('не удалось узнать ветку: не в репозитории?');
  return run.stdout.trim();
}

function latestRunId(branch) {
  const id = gh([
    'run',
    'list',
    '--branch',
    branch,
    '--workflow',
    'CI',
    '--limit',
    '1',
    '--json',
    'databaseId',
    '--jq',
    '.[0].databaseId',
  ]);
  if (id === '' || id === 'null') {
    throw new Error(`у ветки ${branch} нет прогонов CI — запушьте ветку и дождитесь прогона`);
  }
  return id;
}

function main() {
  const runId = process.argv[2] ?? latestRunId(currentBranch());
  const tmp = mkdtempSync(join(tmpdir(), 'measurements-'));
  try {
    console.log(`прогон ${runId}: скачиваю артефакт ${ARTIFACT}…`);
    gh(['run', 'download', runId, '-n', ARTIFACT, '-D', tmp]);
    if (!existsSync(tmp) || readdirSync(tmp).length === 0) {
      throw new Error(`артефакт ${ARTIFACT} пуст — сводная работа измерений не отработала?`);
    }
    const result = syncDir(tmp, MEASUREMENTS_DIR);
    console.log(
      `обновлено ${result.updated.length}, добавлено ${result.added.length}, удалено ${result.removed.length}, без изменений ${result.unchanged}`,
    );
    for (const name of result.updated) console.log(`  ~ ${name}`);
    for (const name of result.added) console.log(`  + ${name}`);
    for (const name of result.removed) console.log(`  − ${name}`);
    console.log(`каталог: ${MEASUREMENTS_DIR}. Дальше — обычный коммит своим именем.`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
