#!/usr/bin/env node
/**
 * Сравнение измерений раскладки: зафиксированные в репозитории файлы историй
 * против собранных в этом прогоне (ADR-230, фаза 4 плана снимков, issue #461).
 *
 * 🔴 Сравнивается структура, а не текст. Голый дифф файлов красил бы на
 * границе округления (287,4 → 287,6 меняет строку) и на перестановке файлов;
 * здесь геометрия сравнивается с допуском в 1px, а палитра, шрифт, радиус,
 * граница и число строк — точно. Текст — отдельной категорией: правка
 * заголовка в `shared/config` меняет строку, но это не «уехала раскладка».
 *
 * Вердикт: любое отличие — новая история, пропавшая, изменённая — красный.
 * Это не «сломано», это «файл в репозитории устарел»: задуманное изменение
 * принимают, обновляя файлы (`pnpm --filter web vr:measure:pull`) — и тогда
 * изменение внешнего вида лежит в диффе PR текстом, ради чего всё и затевалось.
 *
 * Запуск:
 *   node scripts/measurements-compare.mjs --committed <dir> --actual <dir>
 *     [--assemble-report <file>] [--details N]
 */
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { parseStory } from './measurements-format.mjs';

/** Допуск геометрии: округление и субпиксельный шум, а не сдвиг раскладки. */
export const GEOMETRY_TOLERANCE = 1;
const GEOMETRY_EXACT = ['font', 'radius', 'border', 'letterSpacing', 'lines', 'fixed', 'clipped'];
const PALETTE_FIELDS = ['color', 'bg', 'border', 'shadow', 'outline', 'gradient'];
const SHORT = { w: 'w', h: 'h', x: 'x', y: 'y', radius: 'r', border: 'b', letterSpacing: 'ls' };
const PATH_SEP = ' > ';

/** Подпись узла в отчёте: последние два сегмента пути — ключ и его предок. */
export function label(path) {
  const segments = path.split(PATH_SEP);
  return segments.slice(-2).join(' › ');
}

export function readStories(dir) {
  if (!existsSync(dir)) return new Map();
  const stories = new Map();
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.txt')) continue;
    stories.set(name.slice(0, -'.txt'.length), readFileSync(join(dir, name), 'utf8'));
  }
  return stories;
}

const near = (a, b) => Math.abs(a - b) <= GEOMETRY_TOLERANCE;

function diffNodes(before, after, where, out) {
  const beforeByPath = new Map(before.map((n) => [n.path, n]));
  const afterByPath = new Map(after.map((n) => [n.path, n]));
  for (const path of beforeByPath.keys()) {
    if (!afterByPath.has(path)) out.nodes.push(`− ${label(path)} ${where}`);
  }
  for (const node of after) {
    const old = beforeByPath.get(node.path);
    if (old === undefined) {
      out.nodes.push(`+ ${label(node.path)} ${where}`);
      continue;
    }
    const name = label(node.path);
    for (const axis of ['w', 'h', 'x', 'y']) {
      if (!near(old[axis], node[axis])) {
        out.geometry.push(`${name} ${where}: ${SHORT[axis]} ${old[axis]} → ${node[axis]}`);
      }
    }
    for (const field of GEOMETRY_EXACT) {
      if (old[field] !== node[field]) {
        out.geometry.push(
          `${name} ${where}: ${SHORT[field] ?? field} ${old[field] ?? '—'} → ${node[field] ?? '—'}`,
        );
      }
    }
    if (old.text !== node.text) {
      out.text.push(`${name} ${where}: «${old.text ?? ''}» → «${node.text ?? ''}»`);
    }
  }
}

function diffPalette(before, after, where, out) {
  const beforeByPath = new Map(before.map((n) => [n.path, n]));
  for (const entry of after) {
    const old = beforeByPath.get(entry.path);
    if (old === undefined) continue; // узлы считает геометрия
    for (const field of PALETTE_FIELDS) {
      if (old[field] !== entry[field]) {
        out.palette.push(
          `${label(entry.path)} ${where}: ${field} ${old[field] ?? '—'} → ${entry[field] ?? '—'}`,
        );
      }
    }
  }
}

/** Отличия одной истории по категориям; пусто — истории совпали. */
export function diffStory(beforeText, afterText) {
  const before = parseStory(beforeText);
  const after = parseStory(afterText);
  const out = { document: [], fonts: [], nodes: [], geometry: [], palette: [], text: [] };

  const widths = new Set([...before.widths, ...after.widths]);
  for (const width of [...widths].sort((a, b) => a - b)) {
    const a = before.document[width];
    const b = after.document[width];
    if (a === undefined || b === undefined) {
      out.document.push(`@${width}: ${a === undefined ? 'появилась ширина' : 'пропала ширина'}`);
      continue;
    }
    if (!near(a.scrollWidth, b.scrollWidth) || !near(a.scrollHeight, b.scrollHeight)) {
      out.document.push(
        `@${width}: документ ${a.scrollWidth}×${a.scrollHeight} → ${b.scrollWidth}×${b.scrollHeight}`,
      );
    }
    diffNodes(before.geometry[width] ?? [], after.geometry[width] ?? [], `@${width}`, out);

    const darkA = before.geometryDark[width];
    const darkB = after.geometryDark[width];
    if (darkA !== undefined || darkB !== undefined) {
      diffNodes(darkA?.diverged ?? [], darkB?.diverged ?? [], `@${width} dark`, out);
      const missA = new Set(darkA?.missing ?? []);
      const missB = new Set(darkB?.missing ?? []);
      for (const path of missA)
        if (!missB.has(path)) out.nodes.push(`+ ${label(path)} @${width} dark`);
      for (const path of missB)
        if (!missA.has(path)) out.nodes.push(`− ${label(path)} @${width} dark`);
    }
  }

  const fontsA = new Set(before.fonts);
  const fontsB = new Set(after.fonts);
  for (const font of fontsA) if (!fontsB.has(font)) out.fonts.push(`− ${font}`);
  for (const font of fontsB) if (!fontsA.has(font)) out.fonts.push(`+ ${font}`);

  const themes = new Set([...before.themes, ...after.themes]);
  for (const theme of themes) {
    diffPalette(before.palette[theme] ?? [], after.palette[theme] ?? [], `[${theme}]`, out);
    const atA = before.paletteAt[theme] ?? {};
    const atB = after.paletteAt[theme] ?? {};
    for (const width of new Set([...Object.keys(atA), ...Object.keys(atB)])) {
      diffPalette(atA[width] ?? [], atB[width] ?? [], `[${theme} @${width}]`, out);
    }
  }

  return out;
}

const isEmpty = (diff) => Object.values(diff).every((list) => list.length === 0);

function describe(diff) {
  const parts = [];
  if (diff.document.length > 0) parts.push(`документ ${diff.document.length}`);
  if (diff.fonts.length > 0) parts.push(`шрифты ${diff.fonts.length}`);
  const plus = diff.nodes.filter((line) => line.startsWith('+ ')).length;
  const minus = diff.nodes.length - plus;
  if (diff.nodes.length > 0) parts.push(`узлы +${plus}/−${minus}`);
  if (diff.geometry.length > 0) parts.push(`геометрия ${diff.geometry.length}`);
  if (diff.palette.length > 0) parts.push(`палитра ${diff.palette.length}`);
  if (diff.text.length > 0) parts.push(`текст ${diff.text.length}`);
  return parts.join(', ');
}

function whereOf(diff) {
  const places = new Set();
  for (const list of Object.values(diff)) {
    for (const line of list) {
      const m = line.match(/@(\d+)( dark)?|\[([a-z]+)( @\d+)?\]/);
      if (m !== null) places.add(m[0].replace(/[[\]]/g, ''));
    }
  }
  return [...places].join(', ') || '—';
}

const cell = (text) => text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 200);

/**
 * Сводка и вердикт. Чистая функция: на вход — тексты историй из репозитория и
 * из прогона плюс отказы сборки, на выход — красить ли, почему и что показать.
 */
export function compare({ committed, actual, failed = [], details = 40 }) {
  const added = [...actual.keys()].filter((story) => !committed.has(story)).sort();
  const removed = [...committed.keys()].filter((story) => !actual.has(story)).sort();
  const changed = [];
  const broken = [];
  for (const story of [...committed.keys()].filter((s) => actual.has(s)).sort()) {
    try {
      const diff = diffStory(committed.get(story), actual.get(story));
      if (!isEmpty(diff)) changed.push({ story, diff });
    } catch (error) {
      broken.push({ story, reason: String(error instanceof Error ? error.message : error) });
    }
  }

  const reasons = [];
  if (failed.length > 0) {
    reasons.push(
      `${failed.length} историй не дошли до полного замера — это отказ раннера, а не изменение`,
    );
  }
  if (broken.length > 0) reasons.push(`${broken.length} файлов не читаются — формат разошёлся`);
  if (added.length > 0) reasons.push(`${added.length} новых историй без файла в репозитории`);
  if (removed.length > 0)
    reasons.push(`${removed.length} файлов без истории — история удалена или переименована`);
  if (changed.length > 0) reasons.push(`${changed.length} историй изменились`);
  if (reasons.length > 0) {
    reasons.push(
      'файлы измерений в репозитории устарели: если изменение задумано — `pnpm --filter web vr:measure:pull` и коммит',
    );
  }

  const lines = [];
  lines.push(
    `## Измерения раскладки: ${actual.size} историй против ${committed.size} в репозитории`,
    '',
  );
  lines.push('| Итог | Число |', '| --- | --- |');
  lines.push(`| Совпали | ${actual.size - added.length - changed.length - broken.length} |`);
  lines.push(`| Изменились | ${changed.length} |`);
  lines.push(`| Новые (нет файла) | ${added.length} |`);
  lines.push(`| Пропавшие (нет истории) | ${removed.length} |`);
  lines.push(`| Отказы замера | ${failed.length} |`, '');

  if (changed.length > 0) {
    lines.push(`### Изменились — ${changed.length}`, '');
    lines.push('| История | Где | Что |', '| --- | --- | --- |');
    for (const { story, diff } of changed) {
      lines.push(`| \`${story}\` | ${cell(whereOf(diff))} | ${cell(describe(diff))} |`);
    }
    lines.push('');
    const detailLines = [];
    for (const { story, diff } of changed) {
      for (const list of [
        diff.document,
        diff.fonts,
        diff.nodes,
        diff.geometry,
        diff.palette,
        diff.text,
      ]) {
        for (const line of list) detailLines.push(`- \`${story}\` · ${cell(line)}`);
      }
    }
    lines.push(
      `Подробности (первые ${Math.min(details, detailLines.length)} из ${detailLines.length}):`,
      '',
    );
    lines.push(...detailLines.slice(0, details), '');
  }
  if (added.length > 0) {
    lines.push(`### Новые истории — ${added.length}`, '', ...added.map((s) => `- \`${s}\``), '');
  }
  if (removed.length > 0) {
    lines.push(
      `### Пропавшие истории — ${removed.length}`,
      '',
      ...removed.map((s) => `- \`${s}\``),
      '',
    );
  }
  if (failed.length > 0) {
    lines.push(`### Отказы замера — ${failed.length}`, '');
    for (const item of failed) lines.push(`- \`${item.story}\`: ${cell(item.reason)}`);
    lines.push('');
  }
  if (broken.length > 0) {
    lines.push(`### Не читаются — ${broken.length}`, '');
    for (const item of broken) lines.push(`- \`${item.story}\`: ${cell(item.reason)}`);
    lines.push('');
  }

  lines.push(
    reasons.length === 0
      ? '✅ Измерения совпали с зафиксированными.'
      : ['🔴 Работа красная:', '', ...reasons.map((r) => `- ${r}`)].join('\n'),
  );

  return {
    ok: reasons.length === 0,
    reasons,
    markdown: `${lines.join('\n')}\n`,
    added,
    removed,
    changed,
  };
}

function main() {
  const { values } = parseArgs({
    options: {
      committed: { type: 'string' },
      actual: { type: 'string' },
      'assemble-report': { type: 'string', default: '' },
      details: { type: 'string', default: '40' },
    },
  });
  if (values.committed === undefined || values.actual === undefined) {
    console.error('✗ нужны --committed <dir> и --actual <dir>');
    process.exit(2);
  }

  let failed = [];
  if (values['assemble-report'] !== '' && existsSync(values['assemble-report'])) {
    const report = JSON.parse(readFileSync(values['assemble-report'], 'utf8'));
    failed = Array.isArray(report.failed) ? report.failed : [];
  }

  const result = compare({
    committed: readStories(values.committed),
    actual: readStories(values.actual),
    failed,
    details: Number(values.details),
  });

  process.stdout.write(result.markdown);
  if (process.env.GITHUB_STEP_SUMMARY !== undefined) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.markdown);
  }
  for (const reason of result.reasons) console.error(`::error::Измерения: ${reason}`);
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) main();
