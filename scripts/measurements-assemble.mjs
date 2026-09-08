#!/usr/bin/env node
/**
 * Сборка измерений раскладки: частичные JSON от раннера → текстовые файлы
 * историй (ADR-230, фаза 4 плана снимков, issue #461).
 *
 * Раннер пишет по файлу на пару «ширина + тема» (`measure-<story>--<width>-
 * <theme>.json`), а в репозитории лежит один файл на историю — сводная работа
 * пайплайна собирает частичные всех шардов в `<storyId>.txt` через
 * `measurements-format.mjs`.
 *
 * 🔴 История без полного набора пар в текст не пишется. Половина файла
 * выглядела бы в сравнении как «изменение геометрии на 768», хотя на 768
 * история просто не дошла до замера. Такая история — отказ, и её называет
 * отчёт сборки; сравнение читает отчёт и красит.
 *
 * 🔴 Рядом с файлами историй пишется `manifest.json` — паспорт замера
 * (issue #865). С ADR-350 раннер обходит только истории, до которых
 * дотягивается правка, и каталог перестал быть полным слепком: по одному
 * лишь набору файлов уже нельзя сказать, история пропущена осознанно или
 * удалена из витрины. Паспорт отвечает на это прямо — что измерено, что
 * пропущено, что отказало и полон ли обход, — и едет в артефакте вместе с
 * файлами, потому что считал пропуск именно этот прогон.
 *
 * Запуск:
 *   node scripts/measurements-assemble.mjs --partials <dir> --out <dir>
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { formatStory } from './measurements-format.mjs';

/* 🔴 Отрицательные проверки перечисляют ВСЕ служебные имена: файл отказов и
   файл пропущенных начинаются так же, и без вычитания они прочлись бы как
   измерение, не нашли бы в себе `nodes` и уехали бы в отказы — то есть
   осознанный пропуск покрасил бы работу. */
const PARTIAL_FILE = /^measure-(?!failed-|skipped-).*\.json$/;
const FAILED_FILE = /^measure-failed-.*\.json$/;
const SKIPPED_FILE = /^measure-skipped-.*\.json$/;

/**
 * Маркер исхода раннера доли — его пишет работа пайплайна рядом с частичными.
 *
 * 🔴 Нужен ради одного случая, который ведомости не ловят (issue #865): если
 * целая группа не дошла до обхода — например, разделы витрины переименовали и
 * `loadStories` вернул пусто, — она не оставляет ни одной ведомости и не
 * попадает в ожидаемое. Обход тогда называет себя полным, а все истории этой
 * группы выглядят ушедшими из витрины. Раннер при этом красный, и маркер об
 * этом говорит.
 */
const RUNNER_FILE = /^runner-s\d+$/;
const THEMES = ['light', 'dark'];

const isNumberArray = (value) =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'number');
const isStringArray = (value) =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string');

/**
 * Ведомость обхода — файл `measure-skipped-*`, который раннер пишет в
 * `finally` по каждой паре «группа + ширина + тема» своей доли.
 *
 * 🔴 Ведомость несёт не только пропущенные истории, но и **план обхода**:
 * какие ширины и темы эта группа собиралась пройти и сколько всего долей.
 * План объявляется, а не выводится из встреченного, потому что вывод
 * замкнут сам на себя: пара, не отчитавшаяся ни в одной доле, исчезла бы из
 * ожидаемого вместе со своими историями — и обход назвал бы себя полным,
 * потеряв ровно те истории, что закреплены за этой шириной тегом `vr-<N>`.
 */
function ledgerEntry(parsed) {
  const plan = parsed.plan;
  if (
    typeof parsed.group !== 'string' ||
    typeof parsed.width !== 'number' ||
    typeof parsed.theme !== 'string' ||
    typeof parsed.shard !== 'number' ||
    typeof parsed.shards !== 'number' ||
    typeof plan !== 'object' ||
    plan === null ||
    !isNumberArray(plan.widths) ||
    !isStringArray(plan.themes)
  ) {
    return null;
  }
  return {
    group: parsed.group,
    width: parsed.width,
    theme: parsed.theme,
    shard: parsed.shard,
    shards: parsed.shards,
    plan: { widths: [...plan.widths], themes: [...plan.themes] },
  };
}

/** Частичные измерения, отказы и ведомости обхода раннера из каталога. */
export function readPartials(dir) {
  if (!existsSync(dir)) return { partials: [], failed: [], skipped: [], ledger: [], runners: [] };
  const partials = [];
  const failed = [];
  /* Пропущенные копятся множеством: одна история пропускается на каждой паре
     «ширина + тема», и в отчёте она нужна один раз. */
  const skipped = new Set();
  const ledger = [];
  const runners = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (SKIPPED_FILE.test(name)) {
      try {
        const parsed = JSON.parse(readFileSync(path, 'utf8'));
        for (const story of Array.isArray(parsed.skipped) ? parsed.skipped : []) {
          skipped.add(String(story));
        }
        const entry = ledgerEntry(parsed);
        if (entry === null) {
          /* Ведомость без плана обхода не годится в свидетельство полноты, и
             молчать об этом нельзя: пул решает по ней, удалять ли файлы. */
          failed.push({ story: name, reason: 'ведомость обхода без плана обхода' });
        } else {
          ledger.push(entry);
        }
      } catch (error) {
        /* 🔴 Нечитаемый список пропущенных — отказ, а не пустой список: иначе
           сравнение сочло бы пропущенные истории удалёнными и покрасило бы
           работу по ложной причине. */
        failed.push({ story: name, reason: `список пропущенных не читается: ${String(error)}` });
      }
    } else if (FAILED_FILE.test(name)) {
      try {
        const parsed = JSON.parse(readFileSync(path, 'utf8'));
        for (const item of Array.isArray(parsed.failed) ? parsed.failed : []) {
          failed.push({ story: String(item.story ?? '?'), reason: String(item.reason ?? name) });
        }
      } catch (error) {
        failed.push({ story: name, reason: `файл отказов не читается: ${String(error)}` });
      }
    } else if (RUNNER_FILE.test(name)) {
      runners.push({ shard: name, outcome: readFileSync(path, 'utf8').trim() });
    } else if (PARTIAL_FILE.test(name)) {
      try {
        const parsed = JSON.parse(readFileSync(path, 'utf8'));
        if (typeof parsed.story !== 'string' || !Array.isArray(parsed.nodes)) {
          throw new Error('нет story или nodes');
        }
        partials.push(parsed);
      } catch (error) {
        /* Нечитаемое частичное — отказ, а не пропуск: молчание спрятало бы
           целую пару «ширина + тема». */
        failed.push({ story: name, reason: `измерение не читается: ${String(error)}` });
      }
    }
  }
  return { partials, failed, skipped: [...skipped].sort(), ledger, runners };
}

/**
 * Полон ли обход: прошла ли каждая пара «группа + ширина + тема» в каждой доле.
 *
 * 🔴 Вопрос заведён ради удаления файлов измерений (issue #865). Пропущенные и
 * отказавшие истории прогон называет вслух, и по ним видно, что их файлы
 * трогать нельзя. А вот доля, которая не отработала вовсе — упала работа,
 * приехал пустой артефакт, — не оставляет о своих историях ни следа: они
 * выглядят как «не встречены раннером», то есть как удалённые из витрины.
 * Ровно так 343 файла и превратились бы в удаления.
 *
 * Ожидаемое берётся из **плана**, который каждая ведомость объявляет о себе
 * сама: группа, её ширины, темы и число долей. Считать ожидаемое по
 * встреченному нельзя — рассуждение замыкается на себя: пара, которой нет ни в
 * одной доле, пропадает вместе со своими ожиданиями, и обход объявляет себя
 * полным. Ноль ведомостей — тоже неполный обход: прогон не отчитался ни об
 * одной паре.
 */
export function coverage(ledger, runners = []) {
  if (ledger.length === 0) {
    return {
      complete: false,
      shards: 0,
      pairs: 0,
      missing: [],
      why: 'прогон не оставил ни одной ведомости обхода — раннер не дошёл до конца ни на одной паре',
    };
  }

  /* Красный раннер — не «часть историй отказала», а «неизвестно, что он
     успел обойти»: отказавшие истории защищены сами по себе, а вот группа,
     не дошедшая до обхода, следов не оставляет вовсе. */
  const broken = runners.filter((runner) => runner.outcome !== 'success');
  if (broken.length > 0) {
    return {
      complete: false,
      shards: 0,
      pairs: ledger.length,
      missing: [],
      why: `раннер отчитался отказом в долях: ${broken.map((runner) => runner.shard).join(', ')}`,
    };
  }

  const shardCounts = [...new Set(ledger.map((entry) => entry.shards))].sort((a, b) => a - b);
  if (shardCounts.length > 1) {
    return {
      complete: false,
      shards: 0,
      pairs: ledger.length,
      missing: [],
      why: `ведомости разошлись в числе долей: ${shardCounts.join(' и ')}`,
    };
  }
  const shards = shardCounts[0];

  /* План группы обязан быть один: разные ширины у одной группы означают, что
     ведомости пришли от разных сборок раннера, и сравнивать их нельзя. */
  const plans = new Map();
  for (const entry of ledger) {
    const seen = plans.get(entry.group);
    const plan = `${[...entry.plan.widths].sort((a, b) => a - b).join(',')} × ${[...entry.plan.themes].sort().join(',')}`;
    if (seen !== undefined && seen !== plan) {
      return {
        complete: false,
        shards,
        pairs: ledger.length,
        missing: [],
        why: `группа ${entry.group} объявила два разных плана обхода: «${seen}» и «${plan}»`,
      };
    }
    plans.set(entry.group, plan);
  }

  const seen = new Set(
    ledger.map((entry) => `${entry.group} s${entry.shard} ${entry.width}/${entry.theme}`),
  );
  const missing = [];
  for (const group of [...plans.keys()].sort()) {
    const { plan } = ledger.find((entry) => entry.group === group);
    for (const width of [...plan.widths].sort((a, b) => a - b)) {
      for (const theme of [...plan.themes].sort()) {
        for (let shard = 1; shard <= shards; shard += 1) {
          if (!seen.has(`${group} s${shard} ${width}/${theme}`)) {
            missing.push(`${group} ${shard}/${shards} ${width}/${theme}`);
          }
        }
      }
    }
  }

  return {
    complete: missing.length === 0,
    shards,
    pairs: ledger.length,
    missing,
    /* Дыры называются поимённо, а не числом: «нет ведомости на panel 3/4
       390/dark» отправляет читать журнал третьей доли, а «нет 14 ведомостей»
       не отправляет никуда. */
    why:
      missing.length === 0
        ? ''
        : `нет ведомости на ${missing.slice(0, 3).join(', ')}` +
          (missing.length > 3 ? ` и ещё ${missing.length - 3}` : ''),
  };
}

/**
 * Группирует частичные по историям и проверяет полноту: у каждой встреченной
 * ширины обязаны быть обе темы, иначе история идёт в отказы.
 */
export function assemble({ partials, failed }) {
  const byStory = new Map();
  for (const partial of partials) {
    const list = byStory.get(partial.story) ?? [];
    list.push(partial);
    byStory.set(partial.story, list);
  }

  const files = new Map();
  const failures = [...failed];
  for (const [story, list] of [...byStory.entries()].sort(([a], [b]) => a.localeCompare(b, 'ru'))) {
    const widths = [...new Set(list.map((p) => p.width))];
    const missing = [];
    for (const width of widths) {
      for (const theme of THEMES) {
        if (!list.some((p) => p.width === width && p.theme === theme)) {
          missing.push(`${width}/${theme}`);
        }
      }
    }
    if (missing.length > 0) {
      failures.push({ story, reason: `нет измерений для ${missing.join(', ')}` });
      continue;
    }
    files.set(`${story}.txt`, formatStory(list));
  }

  return { files, failed: failures, stories: byStory.size };
}

export function writeFiles(files, out) {
  mkdirSync(out, { recursive: true });
  for (const [name, text] of files) writeFileSync(join(out, name), text, 'utf8');
}

/**
 * Имя паспорта замера в каталоге измерений. Не `.txt` — и поэтому не
 * попадает ни в сравнение, ни в синхронизацию каталога: обе читают только
 * файлы историй.
 */
export const MANIFEST_FILE = 'manifest.json';

/** Версия формата паспорта: читатель обязан отказаться от незнакомой. */
export const MANIFEST_VERSION = 1;

/**
 * Паспорт замера — единственный ответ на вопрос «полон ли этот набор файлов».
 *
 * `measured` дублирует список файлов нарочно: скачанный артефакт сверяется с
 * ним, и обрезанная закачка перестаёт выглядеть замером, в котором историй
 * просто не было.
 */
export function buildManifest({ read, result }) {
  return {
    version: MANIFEST_VERSION,
    stories: result.stories,
    files: result.files.size,
    measured: [...result.files.keys()].map((name) => name.slice(0, -'.txt'.length)),
    failed: result.failed,
    /* Пропущенные по графу импортов — сравнению и пулу: без них файл в
       репозитории без замера читается как удалённая история (issue #856,
       issue #865). */
    skipped: read.skipped,
    coverage: coverage(read.ledger, read.runners),
  };
}

function main() {
  const { values } = parseArgs({
    options: {
      partials: { type: 'string' },
      out: { type: 'string' },
    },
  });
  if (values.partials === undefined || values.out === undefined) {
    console.error('✗ нужны --partials <dir> и --out <dir>');
    process.exit(2);
  }

  const read = readPartials(values.partials);
  const result = assemble(read);
  writeFiles(result.files, values.out);

  const manifest = buildManifest({ read, result });
  writeFileSync(join(values.out, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(
    `историй: ${manifest.stories}, файлов записано: ${manifest.files}, отказов: ${manifest.failed.length}` +
      (manifest.skipped.length > 0 ? `, пропущено по графу: ${manifest.skipped.length}` : ''),
  );
  console.log(
    manifest.coverage.complete
      ? `обход полон: пар ${manifest.coverage.pairs}, долей ${manifest.coverage.shards}`
      : `⚠ обход неполон — ${manifest.coverage.why}`,
  );
  for (const item of result.failed) console.log(`  ✗ ${item.story}: ${item.reason}`);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) main();
