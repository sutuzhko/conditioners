#!/usr/bin/env node
/**
 * Стенд под сквозные сценарии: своя база, своё приложение, своя жизнь.
 *
 * 🔴 Зачем. До этого `pnpm --filter web e2e` на машине разработчика ходил в
 * дев-базу — ту самую, где лежат настоящие обращения владельца. Сценарии
 * заводят заявки, отзывы и наряды и убирают за собой сами, но уборка — это
 * тоже код, и он тоже отказывает. Цена одной её ошибки там — потерянная
 * заявка, то есть деньги (BUGS, «Сквозные тесты ходят в базу с реальными
 * данными владельца»).
 *
 * Что делает по шагам: поднимает `db-test` из профиля `test`, накатывает на
 * неё схему и оба сида, запускает приложение на своём порту против неё,
 * дожидается ответа страницы, гоняет Playwright и гасит приложение. Базу
 * оставляет поднятой: следующий прогон стартует с готовой схемой за секунды,
 * а гасится она обычным `docker compose ... --profile test down`.
 *
 * Запуск (аргументы уходят в Playwright как есть):
 *   pnpm e2e:stand
 *   pnpm e2e:stand e2e/lead.spec.ts --project=desktop
 *
 * 🔴 Порт приложения — 3101, а не 3000: дев-сервер на 3000 смотрит в базу с
 * данными владельца и во время прогона обычно поднят. Совпади порты — часть
 * сценариев пошла бы в него, и вся затея потеряла бы смысл.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const compose = ['-f', 'docker-compose.dev.yml', '--profile', 'test'];

/**
 * 🔴 Переменные берутся из `apps/web/.env.local` — того же файла, из которого
 * живёт хостовый режим (DEPLOY §2.2). Сиды и схема окружения читают
 * `SESSION_SECRET` и `ADMIN_PASSWORD_HASH` из настоящего окружения процесса:
 * `.env.local` разбирает Next, а `tsx prisma/seed-demo.ts` — никто, и без
 * этого шага сид падал на «SESSION_SECRET: Required».
 *
 * `.env.dev` для этого не годится: там доллары в хеше пароля удвоены под
 * Compose, и подставленный отсюда хеш перестал бы подходить.
 */
const localEnv = join(root, 'apps/web/.env.local');

if (!existsSync(localEnv)) {
  process.stderr.write(
    `\n✗ нет ${localEnv}\n  Стенд берёт настройки оттуда же, откуда хостовый режим.\n` +
      '  Заведите файл: cp apps/web/.env.local.example apps/web/.env.local (DEPLOY §2.2)\n',
  );
  process.exit(1);
}

process.loadEnvFile(localEnv);

/** Порт приложения стенда. Дев-сервер занимает 3000, витрина — 6006. */
const PORT = 3101;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Адрес базы стенда. Хост `127.0.0.1`, а не `db-test`: имя сервиса compose
 * разрешается только внутри сети контейнеров, а приложение здесь на хосте
 * (ADR-173). Порт 5433 — тот, что опубликован в `docker-compose.dev.yml`.
 */
const DATABASE_URL = 'postgresql://tk:devpass@127.0.0.1:5433/tulaklimat?schema=public';

/** Сколько ждём готовности: холодная сборка первой страницы идёт до минуты. */
const READY_TIMEOUT_MS = 180_000;
const POLL_MS = 2_000;

/** Окружение шагов подготовки: от дев-режима отличается только базой. */
const stand = { ...process.env, DATABASE_URL, SITE_URL: BASE_URL };

/**
 * Синхронный шаг. Падение печатается и останавливает стенд: продолжать с
 * ненакатанной схемой значит получить полсотни падений вместо одной причины.
 */
function step(title, command, args, options = {}) {
  process.stdout.write(`\n▸ ${title}\n`);

  const done = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: stand,
    ...options,
  });

  if (done.status !== 0) {
    process.stderr.write(`\n✗ шаг «${title}» не прошёл\n`);
    process.exit(done.status ?? 1);
  }
}

/** Готовность базы — по `pg_isready`, а не по паузе: порт открывается раньше. */
async function waitForDatabase() {
  const until = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < until) {
    const probe = spawnSync(
      'docker',
      ['compose', ...compose, 'exec', '-T', 'db-test', 'pg_isready', '-U', 'tk', '-d', 'tulaklimat'],
      { cwd: root, stdio: 'ignore' },
    );
    if (probe.status === 0) return;
    await new Promise((done) => setTimeout(done, POLL_MS));
  }

  process.stderr.write('\n✗ база стенда не поднялась\n');
  process.exit(1);
}

/**
 * Готовность приложения — по ответу самой страницы, а не по открытому порту:
 * Next слушает раньше, чем соберёт первую страницу, и первый же сценарий упал
 * бы на пустом ответе. Тот же приём, что в задании `e2e` пайплайна.
 */
async function waitForApp() {
  const until = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < until) {
    try {
      const answer = await fetch(BASE_URL);
      if (answer.ok) return;
    } catch {
      /* сервер ещё не слушает — это ожидаемо, ждём дальше */
    }
    await new Promise((done) => setTimeout(done, POLL_MS));
  }

  process.stderr.write('\n✗ приложение стенда не поднялось\n');
  process.exit(1);
}

step('база стенда', 'docker', ['compose', ...compose, 'up', '-d', 'db-test']);
await waitForDatabase();

step('схема', 'pnpm', ['--filter', 'web', 'exec', 'prisma', 'migrate', 'deploy']);
step('наполнение', 'pnpm', ['--filter', 'web', 'seed']);
/* Демо-сид обязателен, а не украшение: базовый оставляет настройки компании
   заглушками, а при незаполненных настройках публичная часть отдаёт `noindex`
   и карта сайта пуста (ADR-153) — сценарий о карте падал бы на пустом
   `<urlset>`. Предохранитель демо-сида на петлю не срабатывает: боевыми он
   считает внешние адреса. */
step('демо-данные', 'pnpm', ['--filter', 'web', 'seed:demo']);

process.stdout.write(`\n▸ приложение стенда на ${BASE_URL}\n`);
const app = spawn('pnpm', ['--filter', 'web', 'dev', '-p', String(PORT)], {
  cwd: root,
  stdio: 'inherit',
  env: stand,
});

/* Приложение гасится при любом исходе: без этого упавший прогон оставлял бы
   на порту сервер, а следующий запуск молча пошёл бы в него. */
const stopApp = () => {
  if (app.exitCode === null && app.signalCode === null) app.kill('SIGTERM');
};
process.on('exit', stopApp);
process.on('SIGINT', () => process.exit(130));

await waitForApp();

process.stdout.write('\n▸ сквозные сценарии\n');
const run = spawnSync('pnpm', ['--filter', 'web', 'e2e', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: { ...stand, E2E_BASE_URL: BASE_URL },
});

stopApp();
process.exit(run.status ?? 1);
