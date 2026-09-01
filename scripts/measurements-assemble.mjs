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
 * Запуск:
 *   node scripts/measurements-assemble.mjs --partials <dir> --out <dir> [--report <file>]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { formatStory } from './measurements-format.mjs';

const PARTIAL_FILE = /^measure-(?!failed-).*\.json$/;
const FAILED_FILE = /^measure-failed-.*\.json$/;
const THEMES = ['light', 'dark'];

/** Частичные измерения и отказы раннера из каталога. */
export function readPartials(dir) {
  if (!existsSync(dir)) return { partials: [], failed: [] };
  const partials = [];
  const failed = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (FAILED_FILE.test(name)) {
      try {
        const parsed = JSON.parse(readFileSync(path, 'utf8'));
        for (const item of Array.isArray(parsed.failed) ? parsed.failed : []) {
          failed.push({ story: String(item.story ?? '?'), reason: String(item.reason ?? name) });
        }
      } catch (error) {
        failed.push({ story: name, reason: `файл отказов не читается: ${String(error)}` });
      }
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
  return { partials, failed };
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

function main() {
  const { values } = parseArgs({
    options: {
      partials: { type: 'string' },
      out: { type: 'string' },
      report: { type: 'string', default: '' },
    },
  });
  if (values.partials === undefined || values.out === undefined) {
    console.error('✗ нужны --partials <dir> и --out <dir>');
    process.exit(2);
  }

  const result = assemble(readPartials(values.partials));
  writeFiles(result.files, values.out);

  const report = {
    stories: result.stories,
    files: result.files.size,
    failed: result.failed,
  };
  if (values.report !== '') writeFileSync(values.report, `${JSON.stringify(report, null, 2)}\n`);

  console.log(
    `историй: ${report.stories}, файлов записано: ${report.files}, отказов: ${report.failed.length}`,
  );
  for (const item of result.failed) console.log(`  ✗ ${item.story}: ${item.reason}`);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) main();
