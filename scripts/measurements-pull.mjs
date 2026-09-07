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
 * 🔴 Артефакт применяется целиком — и это правильно ровно до тех пор, пока он
 * снят на том коммите, который сейчас в рабочем дереве (issue #643). Артефакт
 * не «набор правок ветки», а полный слепок измерений на своём коммите: файлы
 * без пары он удаляет, остальные переписывает. Стоит после снятия артефакта
 * влить `main` — и слепок начинает молча возвращать чужие измерения в
 * дослияночный вид. За одну смену это сработало трижды, худший случай — 21
 * откаченный файл, ни один из которых не про раздел ветки. Опасны при этом не
 * удаления (их видно в `git status`), а подмены: они выглядят обычной правкой.
 *
 * Поэтому команда сверяет коммит прогона с `HEAD` и при расхождении
 * отказывается работать, называя оба коммита и то, что делать дальше.
 *
 * Запуск (из корня или из apps/web):
 *   pnpm --filter web vr:measure:pull            — последний прогон текущей ветки
 *   pnpm --filter web vr:measure:pull <run-id>   — конкретный прогон
 *   pnpm --filter web vr:measure:pull --force    — применить вопреки отказу
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

/**
 * Годится ли артефакт прогона для текущего рабочего дерева.
 *
 * Проверок две, и обе отвечают на один вопрос: описывает ли слепок именно то
 * дерево, в которое его собираются положить.
 *
 * 1. **Коммит.** Прогон снят на `run.headSha`; если он не равен `HEAD`, слепок
 *    описывает другое дерево. Частный случай, ради которого правило и заведено:
 *    коммит прогона — предок `HEAD`, то есть после снятия артефакта в ветку
 *    что-то приехало (чаще всего слияние с `main`).
 * 2. **Ветка.** Номер прогона легко взять от соседней ветки — тогда слепок
 *    описывает чужую работу целиком.
 *
 * Возвращает `{ ok }` и, при отказе, готовый текст объяснения: команда только
 * печатает его, решение принимается здесь.
 */
export function checkRun({ run, headSha, branch, ancestor }) {
  if (typeof run.headSha !== 'string' || run.headSha === '') {
    return { ok: false, reason: `прогон ${run.databaseId ?? '?'} не сообщает коммит (headSha)` };
  }

  if (typeof run.headBranch === 'string' && branch !== '' && run.headBranch !== branch) {
    return {
      ok: false,
      reason: [
        `прогон снят на ветке «${run.headBranch}», а рабочее дерево на «${branch}».`,
        'Артефакт — полный слепок измерений своей ветки: применить его сюда значит',
        'заменить измерения этой ветки чужими. Возьмите номер прогона своей ветки.',
      ].join('\n  '),
    };
  }

  if (run.headSha === headSha) return { ok: true };

  const merged = ancestor
    ? [
        'Коммит прогона — предок HEAD: после снятия артефакта в ветку что-то приехало',
        '(обычно слияние с main). Слепок не знает про эти изменения и вернёт их назад —',
        'молча, подменой содержимого, которую в диффе не отличить от обычной правки.',
      ]
    : ['Коммит прогона не связан с HEAD прямой линией — слепок описывает другое дерево.'];

  return {
    ok: false,
    reason: [
      `прогон снят на ${run.headSha.slice(0, 8)}, а в дереве ${headSha.slice(0, 8)}.`,
      ...merged,
      '',
      '  Что делать: запушьте ветку, дождитесь прогона и возьмите его номер явно —',
      '  `pnpm --filter web vr:measure:pull <номер>`. Без номера берётся последний',
      '  прогон ветки, и он может быть старше слияния.',
      '',
      '  Если вы точно знаете, что делаете, — `--force`. Он ничего не проверяет.',
    ].join('\n  '),
  };
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

function git(args) {
  const run = spawnSync('git', args, { encoding: 'utf8' });
  if (run.status !== 0) return null;
  return run.stdout.trim();
}

function currentBranch() {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch === null) throw new Error('не удалось узнать ветку: не в репозитории?');
  return branch;
}

function headSha() {
  const sha = git(['rev-parse', 'HEAD']);
  if (sha === null) throw new Error('не удалось узнать HEAD: не в репозитории?');
  return sha;
}

/** Является ли `maybe` предком `HEAD`. Неизвестный коммит — не предок. */
function isAncestorOfHead(maybe) {
  const run = spawnSync('git', ['merge-base', '--is-ancestor', maybe, 'HEAD'], {
    encoding: 'utf8',
  });
  return run.status === 0;
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

function runInfo(runId) {
  const raw = gh([
    'run',
    'view',
    runId,
    '--json',
    'databaseId,headSha,headBranch,status,conclusion',
  ]);
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`ответ gh про прогон ${runId} не разобран: ${String(error)}`);
  }
}

/**
 * Незакоммиченные правки в исходниках, с которых снимается измерение. Артефакт
 * их не видел, поэтому применённый слепок будет описывать не то дерево, что на
 * диске. Это предупреждение, а не отказ: правка могла быть и в стороне.
 */
function dirtySources() {
  const status = git(['status', '--porcelain', '--', 'apps/web/src', 'apps/web/.storybook']);
  if (status === null || status === '') return [];
  return status.split('\n').map((line) => line.slice(3));
}

function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const explicitRunId = args.find((arg) => !arg.startsWith('--'));

  const branch = currentBranch();
  const runId = explicitRunId ?? latestRunId(branch);
  const run = runInfo(runId);
  const head = headSha();

  const verdict = checkRun({
    run,
    headSha: head,
    branch,
    ancestor: isAncestorOfHead(run.headSha ?? ''),
  });

  if (!verdict.ok) {
    if (!force) {
      throw new Error(`артефакт не подходит рабочему дереву: ${verdict.reason}`);
    }
    console.warn(`⚠ --force: ${verdict.reason}`);
  }

  const dirty = dirtySources();
  if (dirty.length > 0) {
    console.warn(
      `⚠ в дереве ${dirty.length} незакоммиченных правок исходников — артефакт их не видел:`,
    );
    for (const name of dirty.slice(0, 10)) console.warn(`    ${name}`);
    if (dirty.length > 10) console.warn(`    … и ещё ${dirty.length - 10}`);
  }

  const tmp = mkdtempSync(join(tmpdir(), 'measurements-'));
  try {
    console.log(
      `прогон ${runId} (ветка ${run.headBranch ?? '?'}, коммит ${(run.headSha ?? '?').slice(0, 8)}): скачиваю артефакт ${ARTIFACT}…`,
    );
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
    console.log(
      '🔴 Прочитайте дифф: вопрос не «что удаляется», а «какие файлы вне зоны задачи вообще попали».',
    );
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
