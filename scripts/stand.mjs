#!/usr/bin/env node
/**
 * Стенд рабочего дерева: одно число вместо шести портов (issue #153, #154, #155).
 *
 * 🔴 Зачем. `docker-compose.dev.yml` держал зашитыми имя проекта
 * (`conditioner-dev`) и порты 80, 443, 3000, 6006, 5432 и 5433. Второй стенд
 * рядом с основным не поднимался вовсе: compose переиспользовал контейнеры и
 * тома первого, а порты были заняты. Пока это так, `git worktree` бессмыслен —
 * проверять код в нём нечем.
 *
 * 🔴 Смещение, а не список портов. Стендов бывает несколько, и придумывать
 * каждому свою шестёрку чисел руками — то же самое, что зашить их в файл.
 * Смещение — одно число N, и весь набор выводится из него: порт = базовый плюс
 * N×10. Смещение 0 — стенд владельца, и его порты обязаны остаться прежними,
 * иначе завтра он не найдёт свой стенд.
 *
 * 🔴 Где живёт смещение. В `.env` рядом с `docker-compose.dev.yml`: этот файл
 * docker compose читает сам, без флагов. Значит привычная команда
 * `docker compose -f docker-compose.dev.yml exec web …` в рабочем дереве
 * попадает в стенд этого дерева, а не в чужой. Обёртка вокруг compose такого
 * не даёт — половина документации проекта зовёт compose напрямую.
 *
 * Запуск:
 *   node scripts/stand.mjs env  --offset 2   записать окружение стенда
 *   node scripts/stand.mjs up   [--full]     поднять стенд и наполнить демо-данными
 *   node scripts/stand.mjs down [--keep-volumes]
 *   node scripts/stand.mjs ls                какие стенды заведены и что свободно
 *
 * Любая команда принимает `--dry-run`: печатает, что сделала бы, и не делает.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

/** Отказ с человеческим объяснением. Всё остальное — дефект скрипта. */
export class StandError extends Error {}

/** Стенд владельца. Его порты, имя проекта и база неприкосновенны. */
export const MAIN_OFFSET = 0;

/**
 * Потолок смещения. Девять — выбор, а не граница арифметики: со шагом 10
 * ближайшая пара базовых портов с одинаковым остатком (443 и 5433) сошлась бы
 * только на смещениях, отличающихся на 499. Девять взято под ADR-045, который
 * ограничивает работу четырьмя агентами, и под читаемость таблицы в DEPLOY.
 * Поднять потолок можно — непересечение держит перебор в тесте, а не эта цифра.
 */
export const MAX_OFFSET = 9;

/** Шаг смещения. Десять, чтобы базы (5432 и 5433) не наезжали друг на друга. */
export const PORT_STEP = 10;

/** Базовые порты — ровно те, что были зашиты до параметризации. */
export const BASE_PORTS = Object.freeze({
  http: 80,
  https: 443,
  web: 3000,
  storybook: 6006,
  db: 5432,
  dbTest: 5433,
  e2e: 3101,
});

/** Как порт называется в отчёте. Порядок ключей — порядок вывода. */
export const PORT_TITLES = Object.freeze({
  http: 'Caddy http',
  https: 'Caddy https',
  web: 'приложение',
  storybook: 'витрина',
  db: 'база',
  dbTest: 'база сценариев',
  e2e: 'приложение сценариев',
});

/** Переменная `.env`, через которую порт попадает в compose. */
const PORT_VARS = Object.freeze({
  http: 'STAND_PORT_HTTP',
  https: 'STAND_PORT_HTTPS',
  web: 'STAND_PORT_WEB',
  storybook: 'STAND_PORT_STORYBOOK',
  db: 'STAND_PORT_DB',
  dbTest: 'STAND_PORT_DB_TEST',
  e2e: 'STAND_PORT_E2E',
});

/** Что публикует `up`: полный состав и режим «одна база» (DEPLOY §2.2). */
const PUBLISHED = Object.freeze({
  full: ['http', 'https', 'web', 'storybook', 'db'],
  db: ['db'],
});

/** Границы созданного блока в `.env`. По ним он и переписывается. */
const BLOCK_OPEN = '# >>> стенд рабочего дерева — создано `node scripts/stand.mjs env` >>>';
const BLOCK_CLOSE = '# <<< стенд рабочего дерева <<<';

/**
 * Переменные, которые переезжают в `.env` нового дерева из основного.
 *
 * 🔴 Без них на VPN не собирается ни один контейнер: демон Docker при
 * split-DNS не достучится до CDN Docker Hub, и владелец подставляет зеркала
 * (см. `.env.example`). Новый `.env` пишется с нуля, и без переноса первый же
 * `up` в дереве падает на скачивании образа.
 */
const IMAGE_VARS = Object.freeze(['NODE_IMAGE', 'POSTGRES_IMAGE', 'CADDY_IMAGE']);

/** Учётные данные дев-базы. Те же, что в `.env.example` и `.env.local.example`. */
const DB_USER = 'tk';
const DB_PASSWORD = 'devpass';
const DB_NAME = 'tulaklimat';

/* ────────────────────────── смещение и порты ────────────────────────── */

/**
 * Разбор смещения. Отказ, а не молчаливое приведение: «2.5», «два» и «-1»
 * означают, что человек имел в виду что-то другое, и продолжить с нулём —
 * значит увести его в стенд владельца.
 */
export function parseOffset(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') throw new StandError('смещение стенда не задано');
  if (!/^\d+$/.test(text)) {
    throw new StandError(`смещение «${text}» — не целое неотрицательное число`);
  }
  const offset = Number(text);
  if (offset > MAX_OFFSET) {
    throw new StandError(`смещение ${offset} больше предельного ${MAX_OFFSET}`);
  }
  return offset;
}

/** Порты стенда: базовый плюс смещение×10. */
export function standPorts(offset) {
  const shift = parseOffset(offset) * PORT_STEP;
  return Object.fromEntries(Object.entries(BASE_PORTS).map(([key, port]) => [key, port + shift]));
}

/** Суффикс имени проекта. У стенда владельца его нет — имя обязано не измениться. */
export function standSuffix(offset) {
  const value = parseOffset(offset);
  return value === MAIN_OFFSET ? '' : `-${value}`;
}

/** Имя compose-проекта. Оно же различает контейнеры, сети и тома стендов. */
export function standProject(offset) {
  return `conditioner-dev${standSuffix(offset)}`;
}

/**
 * Адрес сайта стенда.
 *
 * `docker` — через Caddy, как на проде; порт в адресе появляется только у
 * смещённых стендов. `host` — приложение на хосте мимо Caddy (DEPLOY §2.2).
 */
export function standSiteUrl(offset, mode = 'docker') {
  const ports = standPorts(offset);
  if (mode === 'host') return `http://localhost:${ports.web}`;
  return ports.http === BASE_PORTS.http
    ? 'http://tulaklimat.localhost'
    : `http://tulaklimat.localhost:${ports.http}`;
}

/**
 * Строка подключения к базе стенда.
 *
 * `container` — изнутри сети compose: хост `db`, порт всегда 5432, смещение ни
 * при чём. `host` и `host-test` — с машины, через опубликованный порт.
 */
export function standDatabaseUrl(offset, from = 'container') {
  if (from === 'container') {
    return `postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}?schema=public`;
  }
  const ports = standPorts(offset);
  return hostDatabaseUrl(from === 'host-test' ? ports.dbTest : ports.db);
}

/** База стенда с машины, по уже известному номеру порта. */
export function hostDatabaseUrl(port) {
  return `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${port}/${DB_NAME}?schema=public`;
}

/* ────────────────────────── файлы окружения ────────────────────────── */

/** Созданный блок `.env` целиком, вместе с маркерами. */
export function renderStandEnv(offset) {
  const value = parseOffset(offset);
  const ports = standPorts(value);
  return [
    BLOCK_OPEN,
    '# Порт = базовый + СМЕЩЕНИЕ×10, имя проекта = conditioner-dev + «-СМЕЩЕНИЕ».',
    '# Блок переписывается целиком — своё дописывайте за маркерами.',
    `STAND_OFFSET=${value}`,
    `STAND_SUFFIX=${standSuffix(value)}`,
    `# сайт стенда: ${standSiteUrl(value)}`,
    ...Object.keys(BASE_PORTS).map((key) => `${PORT_VARS[key]}=${ports[key]}`),
    BLOCK_CLOSE,
    '',
  ].join('\n');
}

/**
 * Вписать блок стенда в текст `.env`, не тронув остальное.
 *
 * 🔴 Остальное — не мелочь: в `.env` лежат зеркала образов (`NODE_IMAGE`,
 * `POSTGRES_IMAGE`), без которых на VPN не собирается ни один контейнер.
 * Переписать файл целиком означало бы отнять их.
 */
export function mergeStandEnv(text, offset) {
  const block = renderStandEnv(offset);
  const source = text ?? '';
  const from = source.indexOf(BLOCK_OPEN);
  if (from === -1) {
    if (source.trim() === '') return block;
    const head = source.endsWith('\n') ? source : `${source}\n`;
    return `${head}\n${block}`;
  }
  const closeAt = source.indexOf(BLOCK_CLOSE, from);
  if (closeAt === -1) {
    throw new StandError(
      'в `.env` блок стенда открыт и не закрыт — верните строку-маркер или удалите блок целиком',
    );
  }
  const tail = source.slice(closeAt + BLOCK_CLOSE.length).replace(/^\n/, '');
  return `${source.slice(0, from)}${block}${tail}`;
}

/** Разбор текста `.env` в пары. Комментарии и пустые строки пропускаются. */
export function parseEnvText(text) {
  const values = {};
  for (const line of String(text ?? '').split('\n')) {
    const found = /^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (found !== null) values[found[1]] = found[2].trim();
  }
  return values;
}

/** Значение переменной в тексте `.env`; закомментированные строки не в счёт. */
export function readEnvValue(text, key) {
  const value = parseEnvText(text)[key];
  return value === undefined ? null : value;
}

/**
 * Смещение, записанное в тексте `.env`. `null` — ключа нет, стенд не настроен.
 *
 * 🔴 Испорченное значение — отказ, а не то же самое, что отсутствие. Молчаливый
 * `null` на `STAND_OFFSET=две` означал бы, что снос сочтёт «гасить нечего»,
 * удалит каталог и оставит контейнеры и тома сиротами навсегда: имя проекта
 * после удаления `.env` взять будет уже неоткуда.
 */
export function readStandOffset(text) {
  const raw = readEnvValue(text, 'STAND_OFFSET');
  if (raw === null) return null;
  try {
    return parseOffset(raw);
  } catch (error) {
    throw new StandError(`испорчено STAND_OFFSET в \`.env\`: ${error.message}`);
  }
}

/**
 * Порты стенда так, как их увидит docker compose: значение из `.env`, а при его
 * отсутствии — вычисленное умолчание. Ровно то же делает `\${VAR:-умолчание}` в
 * compose-файле, и потому правка строки в `.env` не расходится с делом.
 */
export function standPortsFrom(text, offset) {
  return Object.fromEntries(
    Object.entries(standPorts(offset)).map(([key, port]) => {
      const raw = readEnvValue(text, PORT_VARS[key]);
      return [key, raw !== null && /^\d+$/.test(raw) ? Number(raw) : port];
    }),
  );
}

/**
 * Перенести в `.env` дерева те переменные, которые владелец задал в основном:
 * заданное в дереве не перетирается, отсутствующее в источнике не выдумывается.
 */
export function carryEnvValues(text, source, keys = IMAGE_VARS) {
  let next = text;
  for (const key of keys) {
    if (readEnvValue(next, key) !== null) continue;
    const value = readEnvValue(source, key);
    if (value === null || value === '') continue;
    next = setEnvValue(next, key, value);
  }
  return next;
}

/**
 * Заменить значение переменной, сохранив место строки и всё вокруг.
 *
 * Строка остаётся на месте, а не уезжает в конец файла: рядом с каждой
 * переменной в образцах окружения стоит объяснение, почему значение именно
 * такое, и оторванная от него строка внизу превращает объяснение в ложь.
 */
export function setEnvValue(text, key, value) {
  const lines = String(text ?? '').split('\n');
  const at = lines.findIndex((line) => new RegExp(`^\\s*${key}=`).test(line));
  if (at === -1) {
    const body = lines.at(-1) === '' ? lines.slice(0, -1) : lines;
    return [...body, `${key}=${value}`, ''].join('\n');
  }
  lines[at] = `${key}=${value}`;
  return lines.join('\n');
}

/**
 * Удвоить доллары хеша пароля.
 *
 * 🔴 `.env.dev` читает docker compose, а для него `$` — начало имени
 * переменной: `$argon2id` подставится пустотой, хеш приедет в контейнер
 * обрубком, и `verify` вернёт false при верном пароле (см. `.env.example`).
 */
export function doubleDollars(value) {
  return String(value ?? '').replaceAll('$', '$$$$');
}

/* ────────────────────────── рабочие деревья ────────────────────────── */

/** Разбор `git worktree list --porcelain`. */
export function parseWorktrees(porcelain) {
  const found = [];
  for (const block of String(porcelain ?? '').split(/\n\s*\n/)) {
    const path = /^worktree (.+)$/m.exec(block)?.[1];
    if (path === undefined) continue;
    found.push({
      path,
      branch: /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? null,
      bare: /^bare$/m.test(block),
    });
  }
  return found;
}

/** Корень основного дерева по общему каталогу git (`--git-common-dir`). */
export function mainRootFromCommonDir(commonDir) {
  const path = resolve(String(commonDir ?? ''));
  return basename(path) === '.git' ? dirname(path) : path;
}

/**
 * Кто занял какое смещение: ключ — смещение, значение — список путей.
 *
 * 🔴 Смещение занимает дерево, а не человек. Два дерева с одним смещением
 * получают одно имя проекта, и второй `up` перезапустит контейнеры первого на
 * своём коде. Снаружи это выглядит как «мой стенд сам перезагрузился с чужой
 * веткой», и искать причину можно долго.
 */
export function offsetClaims(trees) {
  const claims = new Map();
  for (const tree of trees) {
    if (tree.offset === null || tree.offset === undefined) continue;
    if (!claims.has(tree.offset)) claims.set(tree.offset, []);
    claims.get(tree.offset).push(tree.path);
  }
  return claims;
}

/** Свободные смещения — все, кроме занятых и кроме стенда владельца. */
export function freeOffsets(claims) {
  const free = [];
  for (let offset = MAIN_OFFSET + 1; offset <= MAX_OFFSET; offset += 1) {
    if (!claims.has(offset)) free.push(offset);
  }
  return free;
}

/** Первое свободное смещение. Отказ, если свободных нет. */
export function nextFreeOffset(claims) {
  const free = freeOffsets(claims);
  if (free.length === 0) {
    throw new StandError(
      `свободных смещений нет: заняты все от ${MAIN_OFFSET + 1} до ${MAX_OFFSET}.\n` +
        '  Снесите ненужное дерево: node scripts/worktree.mjs rm <ветка>',
    );
  }
  return free[0];
}

/**
 * Объяснение отказа, если смещение занято чужим деревом; `null` — можно.
 * Своё же дерево не мешает: повторный `env` на том же смещении законен.
 */
export function offsetTaken(offset, claims, self) {
  const holders = (claims.get(offset) ?? []).filter((path) => resolve(path) !== resolve(self));
  if (holders.length === 0) return null;
  return (
    `смещение ${offset} уже занято: ${holders.join(', ')}\n` +
    '  Одно смещение — один стенд: имя проекта у них совпадёт, и `up` перезапустит\n' +
    '  чужие контейнеры на своём коде. Свободные — node scripts/stand.mjs ls'
  );
}

/* ────────────────────────── окружение машины ────────────────────────── */

/**
 * Что означает отказ пробы: 'free' | 'busy' | 'unknown'.
 *
 * 🔴 Занятым считается только `EADDRINUSE`. Порты ниже 1024 обычному процессу
 * недоступны вовсе — проба на них падает с `EACCES`, а Caddy стенда публикуется
 * как раз на 80 и 443. Считать отказ прав занятостью значит **никогда** не
 * поднять полный состав: у свежего стенда контейнеров нет, и `up --full` падал
 * бы на любой машине и любом смещении, да ещё и с указанием не туда.
 * Привилегированный порт всё равно займёт демон Docker, у которого права есть,
 * а столкновение там вскроется отказом самого compose.
 */
export function portVerdict(error) {
  if (error === null || error === undefined) return 'free';
  return error.code === 'EADDRINUSE' ? 'busy' : 'unknown';
}

/** Проба порта на петле попыткой его занять — иначе это гадание. */
export function probePort(port) {
  return new Promise((done) => {
    const probe = createServer();
    probe.once('error', (error) => done(portVerdict(error)));
    probe.once('listening', () => probe.close(() => done(portVerdict(null))));
    probe.listen(port, '127.0.0.1');
  });
}

/**
 * Занятые порты из тех, что стенд собирается опубликовать. Проба подставляется
 * ради теста: без этого регресс на привилегированных портах не проверить.
 */
export async function busyPorts(offset, mode, probe = probePort) {
  const ports = standPorts(offset);
  const busy = [];
  for (const key of PUBLISHED[mode]) {
    if ((await probe(ports[key])) === 'busy') busy.push({ key, port: ports[key] });
  }
  return busy;
}

/**
 * Смещения, за которыми у демона Docker уже числится проект.
 *
 * 🔴 Дерево, снесённое `rm -rf` мимо `worktree:rm`, уносит `.env`, но оставляет
 * контейнеры и тома. По одним деревьям смещение выглядит свободным, новое
 * дерево его занимает — и поднимается на чужом `pgdata`. Поэтому притязания
 * деревьев складываются с тем, что помнит демон.
 *
 * `null` — спросить не удалось (демон не поднят, docker не установлен). Это не
 * ошибка: без демона стендов нет вовсе, а проверка портов остаётся.
 */
export function parseComposeProjects(json) {
  let listed;
  try {
    listed = JSON.parse(String(json ?? ''));
  } catch {
    return null;
  }
  if (!Array.isArray(listed)) return null;
  const offsets = [];
  for (const item of listed) {
    const found = /^conditioner-dev(?:-(\d))?$/.exec(String(item?.Name ?? ''));
    if (found !== null) offsets.push(found[1] === undefined ? MAIN_OFFSET : Number(found[1]));
  }
  return offsets;
}

/** Спросить демон о заведённых проектах стенда. Лениво и без падения. */
export function dockerOffsets() {
  const seen = spawnSync('docker', ['compose', 'ls', '--all', '--format', 'json'], {
    encoding: 'utf-8',
  });
  return seen.status === 0 ? parseComposeProjects(seen.stdout) : null;
}

/** Притязания деревьев плюс то, что помнит демон Docker. */
export function claimsWithDocker(claims, offsets) {
  if (offsets === null) return claims;
  const merged = new Map(claims);
  for (const offset of offsets) {
    if (merged.has(offset)) continue;
    merged.set(offset, [`контейнеры проекта ${standProject(offset)} без дерева`]);
  }
  return merged;
}

/** Корень текущего рабочего дерева. */
export function treeRoot(cwd = process.cwd()) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf-8' }).trim();
}

/** Корень основного дерева — того, где лежит сам репозиторий. */
export function mainRoot(cwd = process.cwd()) {
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd,
    encoding: 'utf-8',
  }).trim();
  return mainRootFromCommonDir(common);
}

/** Все деревья репозитория со смещением, которое каждое себе записало. */
export function trees(cwd = process.cwd()) {
  const listed = parseWorktrees(
    execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd, encoding: 'utf-8' }),
  );
  const root = mainRoot(cwd);
  return listed.map((tree) => {
    const main = resolve(tree.path) === resolve(root);
    /* 🔴 Смещение читается и у основного дерева. Проставить ему ноль «по
       определению» значило бы, что подменённое смещение владельца не покажет
       ни `ls`, ни проверка занятости, — и два дерева получат одно имя проекта.
       Ноль остаётся умолчанием, когда `.env` со смещением там нет. */
    try {
      const offset = offsetOfTreeOrNull(tree.path);
      return { ...tree, main, offset: offset ?? (main ? MAIN_OFFSET : null), broken: false };
    } catch {
      /* Испорченный `.env` соседа не должен мешать работать со своим деревом:
         здесь он показывается, а отказывает уже команда, которая его тронет. */
      return { ...tree, main, offset: null, broken: true };
    }
  });
}

/**
 * Порты стенда дерева ровно так, как их прочитает docker compose: значения из
 * `.env`, где они есть, и вычисленные умолчания, где их нет.
 *
 * 🔴 Через эту дверь читают порты все, кто ходит в стенд мимо compose. Иначе
 * файл врёт: правка строки в `.env` двигала бы контейнеры, а скрипт продолжал
 * бы считать порт по формуле и стучаться не туда.
 */
export function treePorts(root) {
  const envPath = join(root, '.env');
  const text = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
  return standPortsFrom(text, readStandOffset(text) ?? MAIN_OFFSET);
}

/** Смещение дерева или `null`, если стенд в нём не настроен. */
export function offsetOfTreeOrNull(root) {
  const envPath = join(root, '.env');
  return existsSync(envPath) ? readStandOffset(readFileSync(envPath, 'utf-8')) : null;
}

/** Смещение дерева. Отказ, если стенд в нём не настроен. */
export function offsetOfTree(root) {
  const offset = offsetOfTreeOrNull(root);
  if (offset === null) {
    throw new StandError(
      `в ${join(root, '.env')} нет смещения стенда.\n` +
        '  Настройте стенд дерева: node scripts/stand.mjs env --offset <N>',
    );
  }
  return offset;
}

/* ────────────────────────── запуск команд ────────────────────────── */

let dryRun = false;

/** Сухой прогон общий на все скрипты стенда — его включает обёртка worktree. */
export function setDryRun(value) {
  dryRun = value === true;
}

/** Вывод скрипта — это отчёт, а не отладка: его читают глазами. */
export function say(line = '') {
  console.log(line);
}

/**
 * Внешняя команда. При `--dry-run` печатается и не выполняется — так порядок
 * действий читается до того, как он тронет контейнеры.
 */
export function run(command, args, { allowFailure = false, ...options } = {}) {
  say(`  $ ${command} ${args.join(' ')}`);
  if (dryRun) return 0;
  const done = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (done.status !== 0 && !allowFailure) {
    throw new StandError(`команда «${command} ${args.join(' ')}» не прошла`);
  }
  return done.status ?? 1;
}

/** Пауза между пробами готовности. */
function pause(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

/** Аргументы `docker compose` для стенда: свой файл, своё имя проекта. */
export function composeArgs(root, offset, { withTestProfile = false } = {}) {
  return [
    'compose',
    '--project-name',
    standProject(offset),
    '--project-directory',
    root,
    '-f',
    join(root, 'docker-compose.dev.yml'),
    ...(withTestProfile ? ['--profile', 'test'] : []),
  ];
}

/* ────────────────────────── команды ────────────────────────── */

/** Хеш дев-пароля берётся из образца хостового окружения — второго места нет. */
function devPasswordHash(root) {
  const example = readFileSync(join(root, 'apps/web/.env.local.example'), 'utf-8');
  const hash = readEnvValue(example, 'ADMIN_PASSWORD_HASH');
  if (hash === null || hash === '') {
    throw new StandError('в apps/web/.env.local.example нет ADMIN_PASSWORD_HASH');
  }
  return hash;
}

/**
 * Записать окружение стенда: `.env` для compose, `.env.dev` для контейнеров и
 * `apps/web/.env.local` для хостового режима и прогона тестов.
 *
 * 🔴 Все три, а не только `.env`. Дерево без `.env.local` не проходит
 * `pnpm check`: полтора десятка тестов импортируют серверный модуль, а тот
 * читает окружение на импорте (комментарий в `apps/web/vitest.config.ts`).
 * А с `.env.local`, скопированным из образца как есть, дерево смотрит в базу
 * владельца на 5432 — то есть проверки идут по его данным.
 */
export function writeStandEnv(root, offset, { imagesFrom } = {}) {
  const ports = standPorts(offset);

  const envPath = join(root, '.env');
  const current = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
  let next = mergeStandEnv(current, offset);
  /* Зеркала образов переезжают из основного дерева: без них на VPN не
     скачивается ни один образ, а новый `.env` пишется с нуля. */
  if (imagesFrom !== undefined && existsSync(imagesFrom)) {
    const before = next;
    next = carryEnvValues(next, readFileSync(imagesFrom, 'utf-8'));
    if (next !== before) say(`  зеркала образов перенесены из ${imagesFrom}`);
  }
  say(`  ${envPath}`);
  if (!dryRun) writeFileSync(envPath, next);

  /* `.env.dev` — окружение контейнеров. Заводится из образца, если его нет:
     без файла `docker compose up` падает на отсутствующем `env_file`. */
  const devPath = join(root, '.env.dev');
  let dev = existsSync(devPath)
    ? readFileSync(devPath, 'utf-8')
    : readFileSync(join(root, '.env.example'), 'utf-8');
  dev = setEnvValue(dev, 'SITE_URL', standSiteUrl(offset));
  if (readEnvValue(dev, 'ADMIN_PASSWORD_HASH') === 'CHANGE_ME') {
    dev = setEnvValue(dev, 'ADMIN_PASSWORD_HASH', doubleDollars(devPasswordHash(root)));
  }
  say(`  ${devPath}`);
  if (!dryRun) writeFileSync(devPath, dev);

  /* `apps/web/.env.local` — окружение хостового режима, тестов и сидов. */
  const localPath = join(root, 'apps/web/.env.local');
  let local = existsSync(localPath)
    ? readFileSync(localPath, 'utf-8')
    : readFileSync(join(root, 'apps/web/.env.local.example'), 'utf-8');
  local = setEnvValue(local, 'SITE_URL', standSiteUrl(offset, 'host'));
  local = setEnvValue(local, 'DATABASE_URL', standDatabaseUrl(offset, 'host'));
  /* Абсолютный путь, а не `.data/uploads`: относительный считается от рабочего
     каталога, и снимок, загруженный из корня репозитория, в `apps/web` не
     находится (issue #662). Каталог свой на дерево — база у стенда тоже своя. */
  local = setEnvValue(local, 'UPLOADS_DIR', join(root, 'apps/web/.data/uploads'));
  say(`  ${localPath}`);
  if (!dryRun) writeFileSync(localPath, local);

  say('');
  say(`  имя проекта${' '.repeat(12)}${standProject(offset)}`);
  for (const [key, title] of Object.entries(PORT_TITLES)) {
    say(`  ${title.padEnd(22)} ${ports[key]}`);
  }
}

/**
 * Наполнить базу стенда: схема, справочники, демо-данные.
 *
 * 🔴 Только демо-данные, и это не удобство (issue #155). Копировать дев-базу с
 * настоящими обращениями владельца на каждый временный стенд — размножение
 * персональных данных по контейнерам, то есть 152-ФЗ и инвариант 12. `seed`
 * даёт справочники и владельца панели, `seed:demo` — выдуманные записи.
 *
 * 🔴 Порядок обязателен, средний шаг не пропускается: владельца панели заводит
 * именно `seed`, и без него стенд остаётся без единого входа (DEPLOY §2.1).
 */
function fill(root, offset, { inContainer }) {
  if (offset === MAIN_OFFSET) {
    throw new StandError(
      'наполнение стенда со смещением 0 запрещено: это стенд владельца.\n' +
        '  `seed:demo` стирает семнадцать таблиц безусловным deleteMany() — на\n' +
        '  этой базе это потерянные заявки, то есть деньги.',
    );
  }

  /* На хосте переменные сидам даёт не Compose, а этот скрипт: `tsx
     prisma/seed.ts` никаких `.env` не читает и падает на «SESSION_SECRET:
     Required» (тот же приём в scripts/e2e-stand.mjs). */
  const localPath = join(root, 'apps/web/.env.local');
  const hostEnv = {
    ...process.env,
    ...(existsSync(localPath) ? parseEnvText(readFileSync(localPath, 'utf-8')) : {}),
    DATABASE_URL: standDatabaseUrl(offset, 'host'),
  };

  const steps = [
    ['схема', ['--filter', 'web', 'exec', 'prisma', 'migrate', 'deploy']],
    ['справочники и владелец панели', ['--filter', 'web', 'seed']],
    ['демо-данные', ['--filter', 'web', 'seed:demo']],
  ];

  for (const [title, args] of steps) {
    say(`▸ ${title}`);
    if (inContainer) {
      run('docker', [...composeArgs(root, offset), 'exec', '-T', 'web', 'pnpm', ...args]);
    } else {
      run('pnpm', args, { cwd: root, env: hostEnv });
    }
  }
}

/** Ждём `pg_isready`, а не паузу: порт открывается раньше, чем база готова. */
async function waitForDatabase(root, offset) {
  if (dryRun) {
    say('  $ docker compose … exec -T db pg_isready   (ожидание готовности)');
    return;
  }
  const until = Date.now() + 120_000;
  while (Date.now() < until) {
    const probe = spawnSync(
      'docker',
      [
        ...composeArgs(root, offset),
        'exec',
        '-T',
        'db',
        'pg_isready',
        '-U',
        DB_USER,
        '-d',
        DB_NAME,
      ],
      { stdio: 'ignore' },
    );
    if (probe.status === 0) return;
    await pause(2000);
  }
  throw new StandError('база стенда не поднялась за две минуты');
}

/** Поднят ли уже хоть один контейнер этого стенда. */
function standRunning(root, offset) {
  const seen = spawnSync('docker', [...composeArgs(root, offset), 'ps', '-q'], {
    encoding: 'utf-8',
  });
  return (seen.stdout ?? '').trim() !== '';
}

/**
 * Поднять стенд.
 *
 * 🔴 По умолчанию — одна база (43 МБ), а не весь состав. Контейнер `web`
 * занимает до 2 ГБ памяти и до 740% процессора, и машина владельца второго
 * такого не держит: браузер перестаёт открывать страницы, и выглядит это
 * поломкой сайта (ADR-173). Полный состав — осознанным `--full`.
 */
async function up(root, offset, { full, seed }) {
  const mode = full ? 'full' : 'db';
  const busy = await busyPorts(offset, mode);
  if (busy.length > 0 && !standRunning(root, offset)) {
    throw new StandError(
      `порты стенда заняты: ${busy.map((e) => `${e.port} (${PORT_TITLES[e.key]})`).join(', ')},\n` +
        '  а контейнеров этого стенда не поднято — значит порт держит кто-то другой.\n' +
        '  Возьмите свободное смещение: node scripts/stand.mjs ls',
    );
  }

  say(`▸ стенд ${standProject(offset)} — ${full ? 'полный состав' : 'одна база'}`);
  run('docker', [...composeArgs(root, offset), 'up', '-d', ...(full ? [] : ['db'])], { cwd: root });

  say('▸ готовность базы');
  await waitForDatabase(root, offset);

  if (seed) fill(root, offset, { inContainer: full });

  say('');
  say(`  сайт   ${full ? standSiteUrl(offset) : standSiteUrl(offset, 'host')}`);
  if (!full) say('  запуск приложения: pnpm stand:dev');
  say(`  база   127.0.0.1:${standPorts(offset).db}`);
}

/**
 * Погасить стенд.
 *
 * 🔴 Тома уходят вместе с контейнерами (issue #158). `down` без `-v` оставляет
 * `pgdata`, и следующий стенд с тем же смещением поднимется на чужих данных —
 * увидит в панели заявки чужой ветки и не объяснит, откуда они.
 */
function down(root, offset, { keepVolumes, force }) {
  if (offset === MAIN_OFFSET && !force) {
    throw new StandError(
      'снос стенда со смещением 0 запрещён: это стенд владельца, и в его томе\n' +
        '  настоящие заявки. Если действительно нужно — --force.',
    );
  }
  say(`▸ гасим ${standProject(offset)}`);
  run(
    'docker',
    [
      ...composeArgs(root, offset, { withTestProfile: true }),
      'down',
      '--remove-orphans',
      ...(keepVolumes ? [] : ['-v']),
    ],
    { cwd: root },
  );
  if (keepVolumes) say('  тома оставлены флагом --keep-volumes');
}

/**
 * Приложение на хосте, на порту своего стенда (DEPLOY §2.2).
 *
 * 🔴 Отдельная команда, а не `pnpm dev`: тот берёт 3000, то есть порт стенда
 * владельца. Дев-сервер поднялся бы на первом свободном, и адрес дерева
 * перестал бы совпадать с `SITE_URL` в его `.env.local`.
 */
function dev(root, offset) {
  const port = String(standPorts(offset).web);
  say(`▸ приложение дерева на http://localhost:${port}`);
  run('pnpm', ['--filter', 'web', 'dev', '-p', port], { cwd: root });
}

/** Строка таблицы `ls`. Вынесена, чтобы её проверял тест, а не глаз. */
export function standRow(tree) {
  if (tree.broken === true) {
    return `  ✗    ${'STAND_OFFSET испорчен'.padEnd(22)} ${''.padEnd(18)} ${tree.path}`;
  }
  if (tree.offset === null) {
    return `  —    ${'стенд не настроен'.padEnd(22)} ${''.padEnd(18)} ${tree.path}`;
  }
  const ports = standPorts(tree.offset);
  return (
    `  ${String(tree.offset).padEnd(4)} ${standProject(tree.offset).padEnd(22)} ` +
    `${String(ports.web).padEnd(11)} ${String(ports.db).padEnd(6)} ${tree.path}` +
    `${tree.main ? '  (основное)' : ''}`
  );
}

/**
 * Писать ли окружение стенда: отказ с текстом или `null`.
 *
 * Чистая функция, потому что проверяется она подстановкой каталогов, а не
 * запуском в основном дереве владельца: цена ошибки — переписанное окружение
 * его стенда.
 */
export function envRefusal({ tree, main, offset, claims, force = false }) {
  if (force) return null;
  /* 🔴 Забытый `cd` на этом проекте — не гипотеза. Без отказа команда,
     набранная в основном дереве, переписала бы владельцу `.env`, `SITE_URL` в
     `.env.dev` и `DATABASE_URL` в `apps/web/.env.local` — файле вне git с его
     личными настройками, — и привычный `exec web` ушёл бы в пустой проект. */
  if (resolve(tree) === resolve(main)) {
    return (
      'это основное дерево репозитория, здесь стенд владельца.\n' +
      '  Смещение задаётся рабочему дереву, а не ему: перейдите в дерево или\n' +
      '  заведите новое — node scripts/worktree.mjs new <ветка>'
    );
  }
  if (offset === MAIN_OFFSET) {
    return (
      'смещение 0 — стенд владельца: его база, порты и `.env.dev` настроены руками.\n' +
      '  Рабочему дереву нужно своё смещение: node scripts/stand.mjs ls'
    );
  }
  return offsetTaken(offset, claims, tree);
}

/**
 * Притязания на смещения: деревья плюс проекты, которые помнит демон Docker.
 * Один вызов на команду — `docker compose ls` стоит заметно дороже чтения
 * `.env`, и дёргать его на каждое смещение незачем.
 */
export function allClaims(cwd) {
  return claimsWithDocker(offsetClaims(trees(cwd)), dockerOffsets());
}

/** Что заведено и что из этого свободно. */
function list(cwd) {
  const all = trees(cwd).sort((a, b) => (a.offset ?? 99) - (b.offset ?? 99));
  say('смещ. проект                 приложение  база   дерево');
  for (const tree of all) say(standRow(tree));

  const claims = claimsWithDocker(offsetClaims(all), dockerOffsets());
  for (const [offset, holders] of [...claims].sort((a, b) => a[0] - b[0])) {
    const orphan = holders.find((holder) => holder.startsWith('контейнеры проекта'));
    if (orphan !== undefined) say(standRow({ offset, path: `🔴 ${orphan}`, main: false }));
  }

  const free = freeOffsets(claims);
  say('');
  say(`свободные смещения: ${free.length === 0 ? 'нет' : free.join(', ')}`);
}

/* ────────────────────────── разбор аргументов ────────────────────────── */

const USAGE = `Стенд рабочего дерева (docs/DEPLOY.md §2.4).

  node scripts/stand.mjs env  --offset <N>   записать .env, .env.dev и apps/web/.env.local
  node scripts/stand.mjs up   [--full] [--skip-seed]
  node scripts/stand.mjs dev               приложение на хосте, на порту стенда
  node scripts/stand.mjs down [--keep-volumes]
  node scripts/stand.mjs ls

  --offset <N>      смещение стенда; по умолчанию — записанное в .env дерева
  --full            весь состав (caddy, web, worker, storybook, db) вместо одной базы
  --skip-seed       не наполнять базу демо-данными
  --keep-volumes    погасить, но оставить тома
  --force           обойти отказ (основное дерево, смещение 0, занятое смещение)
  --dry-run         напечатать план и ничего не делать`;

/**
 * Разбор ключей. Отказ `parseArgs` переводится в обычный отказ команды: на
 * опечатку вроде `--forse` человеку нужна подсказка, а не стектрейс Node.
 */
export function readArgs(argv, options, usage) {
  try {
    return parseArgs({ args: argv, allowPositionals: true, options });
  } catch (error) {
    throw new StandError(`${error.message}\n\n${usage}`);
  }
}

async function main(argv) {
  const { values, positionals } = readArgs(
    argv,
    {
      offset: { type: 'string' },
      full: { type: 'boolean', default: false },
      'skip-seed': { type: 'boolean', default: false },
      'keep-volumes': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    USAGE,
  );

  dryRun = values['dry-run'];
  const command = positionals[0] ?? 'ls';
  if (values.help || command === 'help') {
    say(USAGE);
    return;
  }

  const root = treeRoot();

  if (command === 'ls') {
    list(root);
    return;
  }

  if (command === 'env') {
    if (values.offset === undefined) throw new StandError(`нужен --offset <N>\n\n${USAGE}`);
    const offset = parseOffset(values.offset);
    const main = mainRoot(root);
    const refusal = envRefusal({
      tree: root,
      main,
      offset,
      claims: allClaims(root),
      force: values.force,
    });
    if (refusal !== null) throw new StandError(refusal);
    say(`▸ окружение стенда, смещение ${offset}`);
    writeStandEnv(root, offset, { imagesFrom: join(main, '.env') });
    return;
  }

  const offset = values.offset === undefined ? offsetOfTree(root) : parseOffset(values.offset);

  if (command === 'up') {
    await up(root, offset, { full: values.full, seed: !values['skip-seed'] });
    return;
  }

  if (command === 'dev') {
    dev(root, offset);
    return;
  }

  if (command === 'down') {
    down(root, offset, { keepVolumes: values['keep-volumes'], force: values.force });
    return;
  }

  throw new StandError(`неизвестная команда «${command}»\n\n${USAGE}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '.').href) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    if (error instanceof StandError) {
      console.error(`\n✗ ${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}
