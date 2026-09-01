#!/usr/bin/env node
/**
 * Сводка и вердикт работы инвариантов.
 *
 * 🔴 Вердикт выносит этот скрипт, а не код возврата Playwright — как у снимков
 * (`vr-summary.mjs`, ADR-230): сводная работа собирает итоги всех шардов и
 * решает по ним разом. Эталона у инвариантов нет, поэтому нет и ярлыка
 * принятия: нарушение либо чинится, либо допускается параметром истории с
 * причиной — допущенное перечисляется, но не красит.
 *
 * Что читает: итоги раннера — по файлу `invariants-<group>[-s<k>of<n>]-<width>-
 * <theme>.json` на пару «ширина + тема». Что пишет: markdown в
 * `$GITHUB_STEP_SUMMARY` и stdout — правила с числом нарушений и историями,
 * раскрытые нарушения с элементом и числами, допущения с причинами, отказы.
 *
 * Красит работу:
 *   - итогов меньше ожидаемого — прогон не дошёл до конца, причина неизвестна;
 *   - есть недопущенные нарушения;
 *   - есть отказы: сценарий истории, таймаут готовности, ошибка навигации;
 *   - раннер завершился ошибкой, которую итог не объясняет.
 *
 * Запуск:
 *   node scripts/invariants-summary.mjs --outcome invariants-outcome --expected 56 \
 *     [--runner success|failure|skipped]
 */
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const OUTCOME_FILE = /^invariants-.*\.json$/;

/** Порядок правил в сводке — от «сломано всё» к «не догрузилось». */
const RULES = [
  'overflow-x',
  'target-size',
  'target-size-touch',
  'theme',
  'clipped-text',
  'occlusion',
  'fonts',
  'images',
];

/**
 * Правила-политики (ADR-232): считаются и показываются отдельно, но не красят.
 * Порог 44×44 в сенсорной раскладке — политика проекта (ADR-183), а не норма
 * WCAG; кит к нему ещё не приведён, и счётчик обязан идти к нулю вместе с
 * редизайном. 🔴 Тот же набор объявлен в `apps/web/e2e/vr/invariants/outcome.ts`:
 * этот скрипт написан на голом Node и типы оттуда не импортирует — менять оба
 * места разом.
 */
const POLICY_RULES = new Set(['target-size-touch']);

/** Сколько историй показывать в таблице политики: топ по числу кадров. */
const POLICY_TOP = 10;

/**
 * Итоги раннера из каталога — по одному файлу на тест. Каталога нет — итогов
 * нет: это факт для сравнения с ожиданием, а не ошибка чтения. Нечитаемый файл
 * становится отказом: молча пропустить его — потерять целую пару «ширина +
 * тема».
 */
export function readOutcomes(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((name) => OUTCOME_FILE.test(name))
    .sort()
    .map((name) => {
      try {
        return normalise(JSON.parse(readFileSync(join(dir, name), 'utf8')));
      } catch (error) {
        return {
          group: '-',
          width: 0,
          theme: '-',
          stories: 0,
          violations: [],
          allowed: [],
          failed: [{ story: name, reason: `итог не читается: ${String(error)}` }],
        };
      }
    });
}

/** Форма итога — контракт с раннером; недостающие поля читаются как пустые. */
function normalise(raw) {
  const list = (value) => (Array.isArray(value) ? value : []);
  const text = (value, fallback) => (typeof value === 'string' ? value : fallback);
  return {
    group: text(raw.group, '-'),
    width: Number(raw.width) || 0,
    theme: text(raw.theme, '-'),
    stories: Number(raw.stories) || 0,
    violations: list(raw.violations).map((item) => ({
      story: text(item?.story, '?'),
      rule: text(item?.rule, '?'),
      element: text(item?.element, ''),
      detail: text(item?.detail, ''),
    })),
    allowed: list(raw.allowed).map((item) => ({
      story: text(item?.story, '?'),
      rule: text(item?.rule, '?'),
      reason: text(item?.reason, 'причина не названа'),
    })),
    failed: list(raw.failed).map((item) => ({
      story: text(item?.story, '?'),
      reason: text(item?.reason, 'причина не названа'),
    })),
  };
}

/**
 * Сводит итоги пар «ширина + тема» к правилам и историям. Одно и то же
 * нарушение повторяется на каждой паре — читать его надо одной строкой со
 * списком кадров, а не восемью одинаковыми.
 */
export function aggregate(outcomes) {
  const violations = new Map();
  const allowed = new Map();
  const failed = [];
  let stories = 0;

  for (const outcome of outcomes) {
    const frame = `${outcome.width}/${outcome.theme}`;
    stories += outcome.stories;
    for (const item of outcome.violations) {
      const key = [item.rule, item.story, item.element].join(' ');
      const entry = violations.get(key) ?? { ...item, frames: [] };
      entry.frames.push(frame);
      violations.set(key, entry);
    }
    for (const item of outcome.allowed) {
      const key = [item.story, item.rule].join(' ');
      const entry = allowed.get(key) ?? { ...item, frames: [] };
      entry.frames.push(frame);
      allowed.set(key, entry);
    }
    for (const item of outcome.failed) failed.push({ ...item, frame });
  }

  return { stories, violations: [...violations.values()], allowed: [...allowed.values()], failed };
}

/** Русское склонение по числу: 1 нарушение, 2 нарушения, 5 нарушений. */
export function plural(n, one, few, many) {
  const tail = n % 100;
  const last = n % 10;
  if (tail >= 11 && tail <= 19) return `${n} ${many}`;
  if (last === 1) return `${n} ${one}`;
  if (last >= 2 && last <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

const violationsOf = (n) => plural(n, 'нарушение', 'нарушения', 'нарушений');
/** «1 история, 2 истории, 5 историй» — где число стоит само. */
const storiesOf = (n) => plural(n, 'история', 'истории', 'историй');
/** «у 1 истории, у 2 историй» — после «у» падеж другой, и форма единственного числа тоже. */
const storiesAt = (n) => plural(n, 'истории', 'историй', 'историй');

/** Сколько раскрытых строк показывать на правило: сводка читается, а не листается. */
const DETAILS_PER_RULE = 40;

/**
 * Вердикт и текст сводки. Чистая функция: работа даёт факты, она отвечает,
 * красить ли, почему, и что показать человеку.
 */
export function summarize({ expected, runner = 'success', outcomes }) {
  const total = aggregate(outcomes);
  const reasons = [];

  if (outcomes.length < expected) {
    reasons.push(
      `итогов ${outcomes.length} из ${expected} — прогон не дошёл до конца, причина неизвестна`,
    );
  }

  /* Политика — не красит: считается и показывается отдельно (ADR-232). */
  const hard = total.violations.filter((item) => !POLICY_RULES.has(item.rule));
  const policy = total.violations.filter((item) => POLICY_RULES.has(item.rule));
  const framesOf = (items) => items.reduce((sum, item) => sum + item.frames.length, 0);
  const storiesIn = (items) => new Set(items.map((item) => item.story)).size;

  const frameCount = framesOf(hard);
  const violatedStories = storiesIn(hard);
  if (hard.length > 0) {
    reasons.push(
      `${violationsOf(frameCount)} у ${storiesAt(violatedStories)} — починить или допустить параметром истории с причиной`,
    );
  }

  if (total.failed.length > 0) {
    reasons.push(
      `${plural(total.failed.length, 'отказ', 'отказа', 'отказов')} — сценарий истории, готовность или навигация`,
    );
  }

  const explained = hard.length > 0 || total.failed.length > 0;
  if (runner === 'failure' && !explained) {
    reasons.push('раннер завершился ошибкой, которую итог не объясняет — смотрите журнал шага');
  }

  const lines = [];
  lines.push(`## Инварианты: ${storiesOf(total.stories)}, ${violationsOf(frameCount)}`, '');

  lines.push('| Итог | Число |', '| --- | --- |');
  lines.push(`| Итогов раннера | ${outcomes.length} из ${expected} |`);
  lines.push(`| Историй замерено (по всем парам) | ${total.stories} |`);
  lines.push(`| Нарушений | ${frameCount} у ${storiesAt(violatedStories)} |`);
  lines.push(
    `| Политика 44×44 до 900px — предупреждений | ${framesOf(policy)} у ${storiesAt(storiesIn(policy))} |`,
  );
  lines.push(`| Допущено параметром | ${total.allowed.length} |`);
  lines.push(`| Отказов | ${total.failed.length} |`, '');

  if (hard.length > 0) {
    lines.push('### По правилам', '');
    lines.push('| Правило | Нарушений | Историй |', '| --- | --- | --- |');
    for (const rule of rulesInOrder(hard)) {
      const items = hard.filter((item) => item.rule === rule);
      const frames = items.reduce((sum, item) => sum + item.frames.length, 0);
      const count = new Set(items.map((item) => item.story)).size;
      lines.push(`| \`${rule}\` | ${frames} | ${count} |`);
    }
    lines.push('');

    for (const rule of rulesInOrder(hard)) {
      const items = hard
        .filter((item) => item.rule === rule)
        .sort((a, b) => a.story.localeCompare(b.story, 'ru'));
      lines.push(
        `### \`${rule}\` — ${storiesOf(new Set(items.map((item) => item.story)).size)}`,
        '',
      );
      lines.push('| История | Кадры | Элемент | Что не так |', '| --- | --- | --- | --- |');
      for (const item of items.slice(0, DETAILS_PER_RULE)) {
        lines.push(
          `| \`${item.story}\` | ${item.frames.join(', ')} | ${cell(item.element) || '—'} | ${cell(item.detail)} |`,
        );
      }
      if (items.length > DETAILS_PER_RULE) {
        lines.push(
          `| … | | | ещё ${items.length - DETAILS_PER_RULE} — полный список в итогах артефакта |`,
        );
      }
      lines.push('');
    }
  }

  if (policy.length > 0) {
    lines.push(
      `### Политика 44×44 до 900px — предупреждения (ADR-183, ADR-232): ${violationsOf(framesOf(policy))} у ${storiesAt(storiesIn(policy))}`,
      '',
    );
    lines.push(
      'Не красит: кит приводится к порогу редизайном, счётчик обязан идти к нулю. Топ историй по числу кадров:',
      '',
    );
    lines.push('| История | Кадров с нарушением |', '| --- | --- |');
    const perStory = new Map();
    for (const item of policy) {
      perStory.set(item.story, (perStory.get(item.story) ?? 0) + item.frames.length);
    }
    const top = [...perStory.entries()].sort((a, b) => b[1] - a[1]).slice(0, POLICY_TOP);
    for (const [story, count] of top) lines.push(`| \`${story}\` | ${count} |`);
    if (perStory.size > POLICY_TOP) {
      lines.push(`| … | ещё ${storiesOf(perStory.size - POLICY_TOP)} в итогах артефакта |`);
    }
    lines.push('');
  }

  if (total.allowed.length > 0) {
    lines.push(`### Допущено параметром истории — ${total.allowed.length}`, '');
    lines.push('| История | Правило | Кадры | Причина |', '| --- | --- | --- | --- |');
    for (const item of [...total.allowed].sort((a, b) => a.story.localeCompare(b.story, 'ru'))) {
      lines.push(
        `| \`${item.story}\` | \`${item.rule}\` | ${item.frames.join(', ')} | ${cell(item.reason)} |`,
      );
    }
    lines.push('');
  }

  if (total.failed.length > 0) {
    lines.push(`### Отказы — ${total.failed.length}`, '');
    lines.push('| История | Кадр | Причина |', '| --- | --- | --- |');
    for (const item of total.failed) {
      lines.push(`| \`${item.story}\` | ${item.frame} | ${cell(item.reason)} |`);
    }
    lines.push('');
  }

  if (reasons.length === 0) {
    lines.push('✅ Инварианты соблюдены на всех историях.');
  } else {
    lines.push('🔴 Работа красная:', '', ...reasons.map((reason) => `- ${reason}`));
  }

  return { ok: reasons.length === 0, reasons, markdown: `${lines.join('\n')}\n` };
}

/** Известные правила — в заданном порядке, неизвестные — следом по алфавиту. */
function rulesInOrder(violations) {
  const present = new Set(violations.map((item) => item.rule));
  const known = RULES.filter((rule) => present.has(rule));
  const unknown = [...present].filter((rule) => !RULES.includes(rule)).sort();
  return [...known, ...unknown];
}

const cell = (text) => text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 160);

function main() {
  const { values } = parseArgs({
    options: {
      outcome: { type: 'string' },
      expected: { type: 'string' },
      runner: { type: 'string', default: 'success' },
    },
  });

  for (const key of ['outcome', 'expected']) {
    if (values[key] === undefined) {
      console.error(`✗ не задан --${key}`);
      process.exit(2);
    }
  }

  const result = summarize({
    expected: Number(values.expected),
    runner: values.runner,
    outcomes: readOutcomes(values.outcome),
  });

  process.stdout.write(result.markdown);
  if (process.env.GITHUB_STEP_SUMMARY !== undefined) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.markdown);
  }
  for (const reason of result.reasons) console.error(`::error::Инварианты: ${reason}`);
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) main();
