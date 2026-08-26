#!/usr/bin/env node
/**
 * Проверка бюджета JavaScript на публичных страницах.
 *
 * 🔴 Бюджет без автоматической проверки не работает. Прошлый порог уплыл с
 * 154 до 170 КБ тремя незаметными шагами: каждая правка добавляла несколько
 * килобайт, ни одна не выглядела виноватой, а замечено это было через месяц
 * при ручном замере (ADR-088).
 *
 * Считает то же, что печатает `next build` в колонке First Load JS: сумму
 * сжатых размеров чанков, которые страница тянет при первой загрузке.
 * Источник — манифесты сборки, поэтому вторая компиляция не нужна.
 *
 * Числа выходят на пару процентов ниже, чем у `next build` (166.7 против 170
 * КБ на главной): у Next свой уровень сжатия и в его сумму попадают мелочи
 * вроде полифиллов. Пороги заданы с учётом этой разницы — сравнивать нужно
 * замеры одного инструмента, а не смешивать их.
 *
 * Запуск: node scripts/js-budget.mjs <путь к .next> [--strict]
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Пороги в килобайтах. Разделены на две части сознательно: платформенный пол
 * задаёт выбор Next и React и нашими правками не двигается, а спрос — с
 * собственного слоя (ADR-088).
 */
const BUDGET = {
  /** Общий рантайм: не наш код, меняется только сменой версии фреймворка. */
  platform: 105,
  /** Наш слой на самой тяжёлой публичной странице. */
  own: 75,
};

/**
 * Публичные страницы находятся сами, а не перечисляются списком.
 *
 * 🔴 Список руками уже подвёл: `/catalog` и `/catalog/[slug]` появились
 * новыми публичными адресами (ADR-109) и в замер не попали вовсе — молча,
 * потому что страница, которой нет в списке, просто не считается. Это ровно
 * та болезнь, от которой заведён сам скрипт: бюджет уплывает шагами, каждый
 * из которых не выглядит виноватым (ADR-088).
 *
 * Публичная — всё, что кончается на `/page` и не лежит под `/admin`: панель
 * бюджету не подлежит, у неё нет ни выдачи, ни мобильного трафика с 4G.
 */
function publicPages(manifest) {
  const pages = Object.keys(manifest.pages)
    .map(normalize)
    .filter((page) => page.endsWith('/page') && !page.startsWith('/admin/'));

  return [...new Set(pages)].sort();
}

/**
 * В манифесте ключи несут группы маршрутов: `/(site)/page`. Группа — приём
 * раскладки файлов, к адресу она отношения не имеет, поэтому убираем.
 */
function normalize(key) {
  return key.replace(/\/\([^)]+\)/g, '');
}

const KB = 1024;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const dist = process.argv[2];
const strict = process.argv.includes('--strict');
if (dist === undefined) fail('укажите путь к каталогу .next');

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    fail(`не читается ${path} — сборки нет или она неполная`);
  }
}

const appManifest = readJson(join(dist, 'app-build-manifest.json'));
const buildManifest = readJson(join(dist, 'build-manifest.json'));

/** Чанки, общие для всех страниц: они и есть платформенный пол. */
const shared = new Set(buildManifest.rootMainFiles ?? []);

/** Сжатый размер файла: `next build` печатает именно gzip, сверяем тем же. */
function gzippedSize(file) {
  const path = join(dist, file);
  try {
    statSync(path);
  } catch {
    return 0;
  }
  return gzipSync(readFileSync(path)).length;
}

function measure(page) {
  const key = Object.keys(appManifest.pages).find((k) => normalize(k) === page);
  const files = (key === undefined ? [] : appManifest.pages[key]).filter((f) => f.endsWith('.js'));
  if (files.length === 0) return null;

  let platform = 0;
  let own = 0;
  for (const file of new Set(files)) {
    const size = gzippedSize(file);
    if (shared.has(file)) platform += size;
    else own += size;
  }
  return { platform, own };
}

const rows = [];
for (const page of publicPages(appManifest)) {
  const measured = measure(page);
  if (measured === null) continue;
  rows.push({ page, ...measured });
}

if (rows.length === 0) fail('ни одной публичной страницы не нашлось в манифесте');

const platform = Math.max(...rows.map((r) => r.platform)) / KB;
const own = Math.max(...rows.map((r) => r.own)) / KB;
const heaviest = rows.reduce((a, b) => (a.own > b.own ? a : b));

const round = (value) => Math.round(value * 10) / 10;

console.log('Бюджет JS (gzip, ADR-088)\n');
for (const row of rows) {
  const итог = round((row.platform + row.own) / KB);
  console.log(
    `  ${row.page.padEnd(28)} ${String(round(row.own / KB)).padStart(6)} КБ своих  · ${итог} КБ всего`,
  );
}
console.log(
  `\n  платформа: ${round(platform)} из ${BUDGET.platform} КБ` +
    `\n  свой слой: ${round(own)} из ${BUDGET.own} КБ (тяжелее всех ${heaviest.page})`,
);

const превышения = [];
if (platform > BUDGET.platform) {
  превышения.push(
    `платформенный пол вырос до ${round(platform)} КБ при пороге ${BUDGET.platform}. ` +
      'Наш код тут ни при чём — это смена версии Next или React. ' +
      'Порог поднимается новым ADR, вместе с общим (ADR-088)',
  );
}
if (own > BUDGET.own) {
  превышения.push(
    `свой слой вырос до ${round(own)} КБ при пороге ${BUDGET.own} КБ на ${heaviest.page}. ` +
      'Это наш код: смотрите, что добавилось клиентского на публичной странице',
  );
}

if (превышения.length === 0) {
  console.log('\n✓ в бюджете');
  process.exit(0);
}

console.error(`\n${превышения.map((p) => `✗ ${p}`).join('\n')}`);
process.exit(strict ? 1 : 0);
