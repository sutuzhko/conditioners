#!/usr/bin/env node
/**
 * Рабочее дерево на задачу: каталог, ветка и стенд — одной командой
 * (issue #157, #158).
 *
 * 🔴 Зачем. `git checkout` глобален на репозиторий: две сессии в одном каталоге
 * дерутся за ветку — одна заводит свою, вторая коммитит в неё чужую задачу
 * (PRD `docs/prd-github-flow-worktree.md`). Своё дерево на сессию это снимает,
 * но обряд из десяти команд — worktree, ветка, три файла окружения,
 * зависимости, клиент Prisma, стенд, сиды — никто не выполняет целиком, и
 * дерево оказывается настроенным наполовину. Хуже всего половина, в которой
 * `apps/web/.env.local` скопирован из образца: он смотрит в базу владельца на
 * 5432, и проверки идут по его данным.
 *
 * 🔴 Ветка заводится от `release`, а не от `main` (ADR-376, инвариант 19). От
 * `main` она отстаёт на всё влитое за день, и конфликты собираются к вечеру в
 * одну кучу. Базовая ветка — параметр, умолчание `release`.
 *
 * 🔴 Снос отказывается, а не портит. Каталог с незакоммиченной работой и ветка
 * с непушенными коммитами — самое дорогое, что тут можно потерять: восстановить
 * их неоткуда. Оба случая — отказ с объяснением, обход только явным `--force`.
 *
 * Запуск:
 *   node scripts/worktree.mjs new fix/pager-scroll
 *   node scripts/worktree.mjs new feat/calendar --base release --offset 3 --full
 *   node scripts/worktree.mjs rm  fix/pager-scroll
 *   node scripts/worktree.mjs ls
 *
 * `--dry-run` печатает весь порядок действий и ничего не делает.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import {
  MAIN_OFFSET,
  StandError,
  mainRoot,
  nextFreeOffset,
  offsetClaims,
  offsetOfTreeOrNull,
  offsetTaken,
  parseOffset,
  run,
  say,
  setDryRun,
  standPorts,
  standProject,
  standSiteUrl,
  trees,
} from './stand.mjs';

/** Базовая ветка по умолчанию — `release` (ADR-376), а не `main`. */
export const DEFAULT_BASE = 'release';

/**
 * Где живут деревья. `.claude/worktrees/` уже отведён под них скиллом
 * `github-flow`: каталог в `.gitignore` и в `.prettierignore`, то есть тот же
 * код в другой ветке не форматируется отсюда и не уезжает в чужую ветку
 * (issue #417).
 */
export const WORKTREES_DIR = '.claude/worktrees';

/**
 * Имя каталога из имени ветки: `fix/pager-scroll` → `fix-pager-scroll`.
 *
 * Косая черта заменяется, а не режется: `fix/pager` и `feat/pager` — разные
 * ветки, и каталог `pager` для обеих означал бы, что вторая не заводится.
 */
export function worktreeDirName(branch) {
  return String(branch ?? '')
    .replaceAll('/', '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Проверка имени ветки. Правила git, суженные до читаемых имён: описательное
 * имя — требование скилла `github-flow` и инварианта 19.
 */
export function assertBranchName(branch) {
  const name = String(branch ?? '');
  if (name === '') throw new StandError('имя ветки не задано');
  if (!/^[a-z0-9]([a-z0-9._/-]*[a-z0-9])?$/.test(name)) {
    throw new StandError(
      `имя ветки «${name}» не годится: строчные латинские буквы, цифры, «.», «_», «-» и «/»,\n` +
        '  начинается и заканчивается буквой или цифрой. Например: fix/pager-scroll',
    );
  }
  if (name.includes('..') || name.includes('//') || name.endsWith('.lock')) {
    throw new StandError(`имя ветки «${name}» git не примет`);
  }
  if (!name.includes('/')) {
    throw new StandError(
      `имя ветки «${name}» без раздела: ветки в проекте называются по типу правки —\n` +
        '  fix/…, feat/…, docs/…, ci/…, refactor/…, test/…, chore/…',
    );
  }
  return name;
}

/** Найти дерево по пути, имени каталога или имени ветки. */
export function findTree(all, target) {
  const wanted = String(target ?? '');
  return (
    all.find((tree) => resolve(tree.path) === resolve(wanted)) ??
    all.find((tree) => tree.branch === wanted) ??
    all.find((tree) => tree.path.endsWith(`/${worktreeDirName(wanted)}`)) ??
    null
  );
}

/** Вывод git, когда нужен текст, а не код возврата. */
function git(args, { cwd, allowFailure = false } = {}) {
  const done = spawnSync('git', args, { cwd, encoding: 'utf-8' });
  if (done.status !== 0 && !allowFailure) {
    throw new StandError(`git ${args.join(' ')}:\n  ${(done.stderr ?? '').trim()}`);
  }
  return (done.stdout ?? '').trim();
}

/* ────────────────────────── заведение ────────────────────────── */

/**
 * Завести дерево: каталог, ветка от свежей базовой, окружение стенда,
 * зависимости и поднятый стенд.
 */
function create(root, branch, options) {
  assertBranchName(branch);

  const all = trees(root);
  const busy = all.find((tree) => tree.branch === branch);
  if (busy !== undefined) {
    throw new StandError(
      `ветка «${branch}» уже занята деревом ${busy.path}.\n` +
        '  Одна ветка — одно дерево: git второй раз её не выдаст.',
    );
  }

  const path = join(root, WORKTREES_DIR, options.dir ?? worktreeDirName(branch));
  if (existsSync(path)) {
    throw new StandError(
      `каталог ${path} уже есть.\n  Снесите его или возьмите другое имя: --dir <имя>`,
    );
  }

  const claims = offsetClaims(all);
  const offset =
    options.offset === undefined ? nextFreeOffset(claims) : parseOffset(options.offset);
  if (offset === MAIN_OFFSET) {
    throw new StandError('смещение 0 — стенд владельца, рабочему дереву его отдавать нельзя');
  }
  const taken = offsetTaken(offset, claims, path);
  if (taken !== null) throw new StandError(taken);

  /* Свежая база — это `git fetch`, а не надежда на то, что локальная ссылка
     не отстала. Без сети продолжаем с локальной: работать в самолёте законно,
     молча брать вчерашний `release` — нет, поэтому об этом говорится вслух. */
  say(`▸ свежая база: ${options.base}`);
  const fetched = run('git', ['fetch', 'origin', options.base], { cwd: root, allowFailure: true });
  const remote = `origin/${options.base}`;
  const hasRemote =
    git(['rev-parse', '--verify', '--quiet', remote], { cwd: root, allowFailure: true }) !== '';
  const base = fetched === 0 && hasRemote ? remote : options.base;
  if (base !== remote) {
    say(`  ⚠ ${remote} недоступна — ветка заводится от локальной «${options.base}»`);
  }

  say(`▸ дерево ${path}`);
  run('git', ['worktree', 'add', '-b', branch, path, base], { cwd: root });

  say(`▸ окружение стенда, смещение ${offset}`);
  run('node', [join(root, 'scripts/stand.mjs'), 'env', '--offset', String(offset), ...dryFlag()], {
    cwd: path,
  });

  if (options.install) {
    say('▸ зависимости дерева');
    run('pnpm', ['install'], { cwd: path });
    /* Клиент Prisma генерируется под платформу и живёт в node_modules дерева:
       без него `tsc` падает на полях схемы, и выглядит это дефектом кода. */
    run('pnpm', ['--filter', 'web', 'exec', 'prisma', 'generate'], { cwd: path });
  }

  if (options.stand) {
    run(
      'node',
      [
        join(root, 'scripts/stand.mjs'),
        'up',
        ...(options.full ? ['--full'] : []),
        ...(options.seed ? [] : ['--skip-seed']),
        ...dryFlag(),
      ],
      { cwd: path },
    );
  }

  const ports = standPorts(offset);
  say('');
  say('  дерево      ' + path);
  say('  ветка       ' + branch + '  (от ' + base + ')');
  say('  стенд       ' + standProject(offset) + '  смещение ' + offset);
  say('  сайт        ' + (options.full ? standSiteUrl(offset) : standSiteUrl(offset, 'host')));
  say('  база        127.0.0.1:' + ports.db);
  say('');
  say('  дальше:  cd ' + path);
  say('           pnpm stand:dev        приложение на порту ' + ports.web);
  say('           pnpm check            локальный гейт (ADR-376)');
}

/* ────────────────────────── снос ────────────────────────── */

/**
 * Снести дерево: контейнеры, тома, каталог и запись в `git worktree list`.
 *
 * 🔴 Порядок обязателен: сначала контейнеры, потом каталог. У compose нет
 * проекта без файла — снеся каталог первым, мы теряем и `docker-compose.dev.yml`,
 * и `.env` со смещением, а вместе с ними единственный способ узнать, что именно
 * гасить. Осиротевшие тома потом ищутся руками по `docker volume ls`.
 */
function destroy(root, target, options) {
  const all = trees(root);
  const tree = findTree(all, target);
  if (tree === null) {
    throw new StandError(
      `дерева «${target}» нет.\n  Заведённые: ${all.map((t) => t.branch ?? t.path).join(', ')}`,
    );
  }
  if (tree.main) {
    throw new StandError('это основное дерево репозитория — сносить его нечем и незачем');
  }

  const dirty = git(['status', '--porcelain'], { cwd: tree.path });
  if (dirty !== '' && !options.force) {
    throw new StandError(
      `в ${tree.path} есть несохранённые правки:\n` +
        dirty
          .split('\n')
          .slice(0, 10)
          .map((line) => `    ${line}`)
          .join('\n') +
        '\n  Снос уничтожит их безвозвратно. Закоммитьте или обойдите отказ: --force',
    );
  }

  if (tree.branch !== null) {
    const unpushed = git(['rev-list', '--count', tree.branch, '--not', '--remotes'], {
      cwd: tree.path,
      allowFailure: true,
    });
    if (unpushed !== '' && unpushed !== '0' && !options.force) {
      throw new StandError(
        `в ветке «${tree.branch}» ${unpushed} коммит(ов), которых нет ни на одном origin.\n` +
          '  Снос дерева их не тронет, но ветку после него удалять нельзя.\n' +
          '  Запушьте ветку, или оставьте её: --keep-branch, или обойдите: --force',
      );
    }
  }

  const offset = offsetOfTreeOrNull(tree.path);
  if (offset === null) {
    say('▸ стенд не настроен — гасить нечего');
  } else {
    run('node', [join(tree.path, 'scripts/stand.mjs'), 'down', ...dryFlag()], { cwd: tree.path });
  }

  say(`▸ каталог ${tree.path}`);
  run('git', ['worktree', 'remove', ...(options.force ? ['--force'] : []), tree.path], {
    cwd: root,
  });
  run('git', ['worktree', 'prune'], { cwd: root });

  if (tree.branch !== null && !options.keepBranch) {
    say(`▸ ветка ${tree.branch}`);
    /* `-d`, а не `-D`: невлитую ветку git не отдаст, и это правильно —
       удалённая невлитая ветка не восстанавливается ничем, кроме reflog. */
    const removed = run('git', ['branch', '-d', tree.branch], { cwd: root, allowFailure: true });
    if (removed !== 0) say(`  ветка «${tree.branch}» не влита и оставлена как есть`);
  }

  if (offset !== null) reportLeftovers(offset);
}

/** Что осталось после сноса. Тома ищутся по ярлыку проекта, который ставит compose. */
function reportLeftovers(offset) {
  if (isDry()) {
    say(
      `  $ docker volume ls -q --filter label=com.docker.compose.project=${standProject(offset)}`,
    );
    return;
  }
  const left = spawnSync(
    'docker',
    ['volume', 'ls', '-q', '--filter', `label=com.docker.compose.project=${standProject(offset)}`],
    { encoding: 'utf-8' },
  );
  const names = (left.stdout ?? '').trim();
  say('');
  say(names === '' ? '  томов не осталось' : `  🔴 остались тома: ${names.split('\n').join(', ')}`);
}

/* ────────────────────────── разбор аргументов ────────────────────────── */

let dry = false;
const isDry = () => dry;
const dryFlag = () => (dry ? ['--dry-run'] : []);

const USAGE = `Рабочее дерево на задачу (docs/DEPLOY.md §2.4).

  node scripts/worktree.mjs new <ветка> [ключи]
  node scripts/worktree.mjs rm  <ветка|каталог> [ключи]
  node scripts/worktree.mjs ls

  --base <ветка>    от чего заводить; по умолчанию ${DEFAULT_BASE} (ADR-376)
  --offset <N>      смещение стенда; по умолчанию первое свободное
  --dir <имя>       имя каталога; по умолчанию из имени ветки
  --full            поднять весь состав, а не одну базу (см. ADR-173)
  --skip-stand      не поднимать стенд вовсе
  --skip-seed       не наполнять базу демо-данными
  --skip-install    не ставить зависимости
  --keep-branch     при сносе оставить ветку
  --force           обойти отказ (несохранённые правки, непушенные коммиты)
  --dry-run         напечатать план и ничего не делать`;

function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      base: { type: 'string', default: DEFAULT_BASE },
      offset: { type: 'string' },
      dir: { type: 'string' },
      full: { type: 'boolean', default: false },
      'skip-stand': { type: 'boolean', default: false },
      'skip-seed': { type: 'boolean', default: false },
      'skip-install': { type: 'boolean', default: false },
      'keep-branch': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });

  dry = values['dry-run'];
  setDryRun(dry);

  const command = positionals[0] ?? 'ls';
  if (values.help || command === 'help') {
    say(USAGE);
    return;
  }

  const root = mainRoot();

  if (command === 'ls') {
    run('node', [join(root, 'scripts/stand.mjs'), 'ls']);
    return;
  }

  if (command === 'new') {
    create(root, positionals[1], {
      base: values.base,
      offset: values.offset,
      dir: values.dir,
      full: values.full,
      stand: !values['skip-stand'],
      seed: !values['skip-seed'],
      install: !values['skip-install'],
    });
    return;
  }

  if (command === 'rm') {
    destroy(root, positionals[1], {
      force: values.force,
      keepBranch: values['keep-branch'],
    });
    return;
  }

  throw new StandError(`неизвестная команда «${command}»\n\n${USAGE}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '.').href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    if (error instanceof StandError) {
      console.error(`\n✗ ${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}
