#!/usr/bin/env node
/**
 * Сводка и вердикт работы снимков.
 *
 * 🔴 Вердикт выносит этот скрипт, а не код возврата Playwright (ADR-230).
 * Эталонов в репозитории нет: кадр ветки сравнивается с кадром базы
 * (`merge-base`), снятым в той же работе, и разошедшийся кадр — не обязательно
 * поломка. Задуманное изменение внешнего вида автор принимает ярлыком
 * `vr:accepted` на PR. Playwright же возвращает ненулевой код на любое
 * расхождение, и по нему принятое от непринятого не отличить.
 *
 * Что читает: итоги раннера — по файлу `outcome-<project>-<width>-<theme>.json`
 * на пару «ширина + тема». Что пишет: markdown в `$GITHUB_STEP_SUMMARY` и в
 * stdout — разошедшиеся истории с ширинами и темами, новые истории, отказы с
 * причинами.
 *
 * Красит работу, и ярлык на это не действует:
 *   - итогов меньше ожидаемого — прогон не дошёл до конца, причина неизвестна;
 *   - есть отказы: сценарий истории, таймаут готовности, ошибка навигации;
 *   - раннер завершился ошибкой, которую итог не объясняет.
 * Красит только без ярлыка: разошедшиеся кадры в режиме сравнения.
 *
 * Запуск:
 *   node scripts/vr-summary.mjs --project public --mode compare \
 *     --outcome vr-outcome --expected 8 [--accepted true] [--base <sha>] \
 *     [--cache hit|miss] [--base-outcome <dir>] \
 *     [--runner success|failure|skipped] [--artifact vr-diff]
 */
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const OUTCOME_FILE = /^outcome-.*\.json$/;

/**
 * Итоги раннера из каталога — по одному файлу на тест. Каталога нет — итогов
 * нет: это не ошибка чтения, а факт, который дальше сравнивается с ожиданием.
 * Нечитаемый файл возвращается как отказ: молча пропустить его — значит
 * потерять целую пару «ширина + тема».
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
          width: 0,
          theme: '-',
          compared: 0,
          changed: [],
          new: [],
          failed: [{ story: name, reason: `итог не читается: ${String(error)}` }],
        };
      }
    });
}

/** Форма итога — контракт с раннером; недостающие поля читаются как пустые. */
function normalise(raw) {
  const list = (value) => (Array.isArray(value) ? value : []);
  return {
    width: Number(raw.width) || 0,
    theme: typeof raw.theme === 'string' ? raw.theme : '-',
    compared: Number(raw.compared) || 0,
    changed: list(raw.changed).map(String),
    new: list(raw.new).map(String),
    failed: list(raw.failed).map((item) => ({
      story: String(item?.story ?? '?'),
      reason: String(item?.reason ?? 'причина не названа'),
    })),
    hashes:
      typeof raw.hashes === 'object' && raw.hashes !== null
        ? Object.fromEntries(
            Object.entries(raw.hashes).filter(([, hash]) => typeof hash === 'string'),
          )
        : {},
    skipped: Number(raw.skipped) || 0,
  };
}

/** Сводит итоги пар «ширина + тема» к историям: одна история — все её кадры. */
export function aggregate(outcomes) {
  const changed = new Map();
  const fresh = new Map();
  const failed = [];
  let compared = 0;

  /* Дубли считаются внутри пары «ширина + тема»: одинаковый хеш одной истории
     на разных парах — норма (одна и та же раскладка), а разных историй на
     одной паре — дыра покрытия (issue #464). Группа ключуется составом
     историй, кадры копятся списком. */
  const duplicates = new Map();
  let hashed = 0;

  let skipped = 0;
  for (const outcome of outcomes) {
    const frame = `${outcome.width}/${outcome.theme}`;
    compared += outcome.compared;
    skipped += outcome.skipped ?? 0;
    for (const story of outcome.changed) changed.set(story, [...(changed.get(story) ?? []), frame]);
    for (const story of outcome.new) fresh.set(story, [...(fresh.get(story) ?? []), frame]);
    for (const item of outcome.failed) failed.push({ ...item, frame });

    const byHash = new Map();
    for (const [story, hash] of Object.entries(outcome.hashes ?? {})) {
      hashed += 1;
      byHash.set(hash, [...(byHash.get(hash) ?? []), story]);
    }
    for (const group of byHash.values()) {
      if (group.length < 2) continue;
      const stories = [...group].sort((a, b) => a.localeCompare(b, 'ru'));
      const key = stories.join('\u0000');
      const entry = duplicates.get(key) ?? { stories, frames: [] };
      entry.frames.push(frame);
      duplicates.set(key, entry);
    }
  }

  return {
    compared,
    skipped,
    changed,
    new: fresh,
    failed,
    hashed,
    duplicates: [...duplicates.values()].sort(
      (a, b) => b.frames.length - a.frames.length || a.stories[0].localeCompare(b.stories[0], 'ru'),
    ),
  };
}

const frames = (n) => plural(n, 'кадр', 'кадра', 'кадров');
/** «1 история, 2 истории, 5 историй» — в заголовке, где число стоит само. */
const stories = (n) => plural(n, 'история', 'истории', 'историй');
/** «у 1 истории, у 2 историй» — после «у» падеж другой, и форма единственного числа тоже. */
const storiesAfterAt = (n) => plural(n, 'истории', 'историй', 'историй');

/** Русское склонение по числу: 1 кадр, 2 кадра, 5 кадров, 21 кадр, 11 кадров. */
export function plural(n, one, few, many) {
  const tail = n % 100;
  const last = n % 10;
  if (tail >= 11 && tail <= 19) return `${n} ${many}`;
  if (last === 1) return `${n} ${one}`;
  if (last >= 2 && last <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

const framesOf = (map) => [...map.values()].reduce((sum, list) => sum + list.length, 0);

/**
 * Вердикт и текст сводки. Чистая функция: работа даёт ей факты, она отвечает,
 * красить ли, почему, и что показать человеку.
 */
export function summarize({
  project,
  mode,
  base = '',
  cache = '',
  expected,
  accepted = false,
  runner = 'success',
  artifact = '',
  outcomes,
  baseOutcomes = [],
}) {
  const total = aggregate(outcomes);
  const reasons = [];

  if (outcomes.length < expected) {
    reasons.push(
      `итогов ${outcomes.length} из ${expected} — прогон не дошёл до конца, причина неизвестна`,
    );
  }

  if (total.failed.length > 0) {
    reasons.push(
      `${plural(total.failed.length, 'отказ', 'отказа', 'отказов')} — сценарий истории, готовность или навигация; ярлык на это не действует`,
    );
  }

  const changedFrames = framesOf(total.changed);
  if (mode === 'compare' && total.changed.size > 0 && !accepted) {
    reasons.push(
      `разошлось ${frames(changedFrames)} у ${storiesAfterAt(total.changed.size)} — изменения не приняты; если они задуманы, поставьте на PR ярлык \`vr:accepted\``,
    );
  }

  /* Новая история тоже объясняет красный код раннера: Playwright считает
     отсутствующий эталон ошибкой и пишет кадр ветки как actual. Так было на
     первом же прогоне против merge-base: у базы отказал сценарий одной
     истории, её кадра в базе не оказалось, и восемь «doesn't exist» без этой
     оговорки читались как необъяснённое падение. */
  const explained = total.changed.size > 0 || total.new.size > 0 || total.failed.length > 0;
  if (runner === 'failure' && !explained) {
    reasons.push('раннер завершился ошибкой, которую итог не объясняет — смотрите журнал шага');
  }

  const baseFailed = aggregate(baseOutcomes).failed;

  const lines = [];
  const title =
    mode === 'record'
      ? `## Снимки · ${project}: кадры \`${short(base)}\` записаны в кеш`
      : `## Снимки · ${project}: ${frames(total.compared)} против базы \`${short(base)}\``;
  lines.push(title, '');

  lines.push('| Итог | Число |', '| --- | --- |');
  lines.push(`| Итогов раннера | ${outcomes.length} из ${expected} |`);
  if (mode === 'compare') {
    lines.push(`| Кадры базы | ${cache === 'hit' ? 'из кеша' : 'сняты в работе — промах кеша'} |`);
    lines.push(`| Сравнено кадров | ${total.compared} |`);
    lines.push(`| Разошлось | ${frames(changedFrames)} у ${storiesAfterAt(total.changed.size)} |`);
    lines.push(`| Новых историй — без сравнения | ${total.new.size} |`);
    /* Граф импортов (#444): истории, до которых правка не дотягивается, не
       снимались вовсе — это видно числом, а не молчанием. */
    if (total.skipped > 0) {
      lines.push(`| Пропущено по графу импортов | ${stories(total.skipped)} |`);
    }
  } else {
    lines.push(`| Записано кадров | ${total.compared} |`);
  }
  lines.push(`| Отказов | ${total.failed.length} |`);
  if (total.hashed > 0) {
    lines.push(
      `| Одинаковые кадры у разных историй | ${plural(total.duplicates.length, 'группа', 'группы', 'групп')} |`,
    );
  }
  lines.push('');

  if (total.changed.size > 0) {
    lines.push(`### Разошлись — ${stories(total.changed.size)}`, '');
    lines.push('| История | Ширины и темы |', '| --- | --- |');
    for (const [story, list] of sortedEntries(total.changed)) {
      lines.push(`| \`${story}\` | ${list.join(', ')} |`);
    }
    lines.push('');
    if (accepted) {
      lines.push(`✅ Изменения приняты ярлыком \`vr:accepted\` — ${frames(changedFrames)}.`, '');
    } else {
      lines.push(
        `🔴 Изменения не приняты. Если они задуманы — поставьте на PR ярлык \`vr:accepted\`; проверка перезапустится сама.`,
        '',
      );
    }
    if (artifact !== '') {
      lines.push(
        `Картинки разницы (\`-actual\`, \`-expected\`, \`-diff\`) — в артефакте \`${artifact}\`.`,
        '',
      );
    }
  }

  if (total.new.size > 0) {
    lines.push(`### Новые истории — сравнивать не с чем — ${total.new.size}`, '');
    for (const [story, list] of sortedEntries(total.new))
      lines.push(`- \`${story}\` — ${list.join(', ')}`);
    lines.push('');
  }

  if (total.duplicates.length > 0) {
    /* Диагностика, не вердикт: пара законных дублей существует (история про
       поведение при том же виде), а дыру покрытия решает человек — тегом
       `vr-<ширина>` или правкой истории (issue #464). */
    lines.push(
      `### Одинаковые кадры у разных историй — ${plural(total.duplicates.length, 'группа', 'группы', 'групп')}`,
      '',
    );
    for (const entry of total.duplicates) {
      lines.push(
        `- ${entry.stories.map((story) => `\`${story}\``).join(', ')} — ${entry.frames.join(', ')}`,
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

  if (baseFailed.length > 0) {
    lines.push(
      `⚠️ У базы \`${short(base)}\` отказали сценарии (${baseFailed.length}) — это её поломка, а не этого PR; кадры таких историй в базе сняты не с того состояния:`,
      '',
    );
    /* По историям, а не по кадрам: отказ сценария повторяется на каждой паре
       «ширина + тема», и восемь строк про одну историю читаются хуже одной. */
    for (const [story, items] of groupByStory(baseFailed)) {
      const frames = items.map((item) => item.frame).join(', ');
      lines.push(`- \`${story}\` — ${frames}: ${cell(items[0].reason)}`);
    }
    lines.push('');
  }

  if (reasons.length === 0) {
    lines.push(
      mode === 'record'
        ? '✅ Кадры записаны, отказов нет.'
        : total.changed.size === 0
          ? '✅ Все кадры совпали с базой.'
          : '✅ Расхождения приняты, отказов нет.',
    );
  } else {
    lines.push('🔴 Работа красная:', '', ...reasons.map((reason) => `- ${reason}`));
  }

  return { ok: reasons.length === 0, reasons, markdown: `${lines.join('\n')}\n` };
}

const short = (sha) => (sha.length > 7 ? sha.slice(0, 7) : sha || '—');
const cell = (text) => text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 200);
const sortedEntries = (map) => [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'ru'));
const groupByStory = (items) =>
  sortedEntries(
    items.reduce(
      (map, item) => map.set(item.story, [...(map.get(item.story) ?? []), item]),
      new Map(),
    ),
  );

function main() {
  const { values } = parseArgs({
    options: {
      project: { type: 'string' },
      mode: { type: 'string' },
      base: { type: 'string', default: '' },
      cache: { type: 'string', default: '' },
      outcome: { type: 'string' },
      'base-outcome': { type: 'string', default: '' },
      expected: { type: 'string' },
      accepted: { type: 'string', default: 'false' },
      runner: { type: 'string', default: 'success' },
      artifact: { type: 'string', default: '' },
    },
  });

  for (const key of ['project', 'mode', 'outcome', 'expected']) {
    if (values[key] === undefined) {
      console.error(`✗ не задан --${key}`);
      process.exit(2);
    }
  }
  if (values.mode !== 'compare' && values.mode !== 'record') {
    console.error(`✗ --mode: ожидается compare или record, получено «${values.mode}»`);
    process.exit(2);
  }

  const result = summarize({
    project: values.project,
    mode: values.mode,
    base: values.base,
    cache: values.cache,
    expected: Number(values.expected),
    accepted: values.accepted === 'true',
    runner: values.runner,
    artifact: values.artifact,
    outcomes: readOutcomes(values.outcome),
    baseOutcomes: values['base-outcome'] === '' ? [] : readOutcomes(values['base-outcome']),
  });

  process.stdout.write(result.markdown);
  if (process.env.GITHUB_STEP_SUMMARY !== undefined) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.markdown);
  }
  for (const reason of result.reasons)
    console.error(`::error::Снимки · ${values.project}: ${reason}`);
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) main();
