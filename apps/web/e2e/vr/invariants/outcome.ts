import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Shard } from '../shard';
import { KNOWN_DEFECTS, knownDefectReason, type KnownDefect } from './known-defects';
import type { InvariantRule, Violation } from './measure';

/**
 * Итог прогона инвариантов — то, по чему сводная работа пайплайна решает,
 * красить ли PR (ADR-230, фаза 3 плана снимков).
 *
 * Инварианты — правила, верные для любой истории: документ не переполнен,
 * цель не меньше порога, тема совпадает с запрошенной, текст не обрезан и не
 * вылит за край, поверх цели никто не лежит, шрифты и картинки загрузились.
 * Эталона у них нет, и категорий здесь три: нарушение — красит; допущение — параметр истории с
 * причиной, перечисляется, но не красит; отказ — история не дошла до замера,
 * красит всегда.
 *
 * Модуль намеренно не импортирует Playwright: накопитель и запись — чистые
 * функции, их проверяет vitest без браузера.
 */

export type StoryViolation = {
  readonly story: string;
  readonly rule: InvariantRule;
  readonly element: string;
  readonly detail: string;
};

export type StoryAllowance = {
  readonly story: string;
  readonly rule: InvariantRule;
  readonly reason: string;
};

export type StoryFailure = {
  readonly story: string;
  readonly reason: string;
};

export type InvariantsGroup = 'public' | 'panel';

/**
 * Правила-политики: считаются и показываются в сводке, но не красят (ADR-232).
 * Сегодня это порог 44×44 в сенсорной раскладке (ADR-183): кит ещё не приведён
 * к нему, редизайн идёт, и красный на 279 историях был бы шумом, который
 * перестают читать (ADR-167). Счётчик виден в сводке и обязан идти к нулю.
 *
 * 🔴 Тот же набор продублирован в `scripts/invariants-summary.mjs` — сводка
 * написана на голом Node и типы отсюда не импортирует; менять оба места разом.
 */
export const POLICY_RULES: ReadonlySet<InvariantRule> = new Set<InvariantRule>([
  'target-size-touch',
]);

/**
 * Итог одного теста — пары «ширина + тема» одной группы. Имена ключей заданы
 * контрактом со сводкой `scripts/invariants-summary.mjs`: она читает файл, а
 * не тип.
 */
export type InvariantsOutcome = {
  readonly group: InvariantsGroup;
  readonly width: number;
  readonly theme: string;
  /** Сколько историй дошло до замера. */
  readonly stories: number;
  readonly violations: readonly StoryViolation[];
  readonly allowed: readonly StoryAllowance[];
  readonly failed: readonly StoryFailure[];
};

/** Накопитель по ходу теста. */
export type InvariantsTally = {
  stories: number;
  readonly violations: StoryViolation[];
  readonly allowed: StoryAllowance[];
  readonly failed: StoryFailure[];
};

export function emptyInvariantsTally(): InvariantsTally {
  return { stories: 0, violations: [], allowed: [], failed: [] };
}

/**
 * Раскладывает ответ измерителя по категориям: допущенное — отдельно, с
 * причиной из параметра истории, чтобы сводка показала, что и почему
 * пропущено. Молчаливое допущение — это выключенная проверка.
 */
export function recordViolations(
  tally: InvariantsTally,
  story: string,
  violations: readonly Violation[],
  defects: readonly KnownDefect[] = KNOWN_DEFECTS,
): void {
  tally.stories += 1;
  for (const violation of violations) {
    /* Допущение параметром истории — первым; известный дефект компонента —
       вторым (ADR-232): оба уходят в `allowed` с причиной и не красят. */
    const allowed = violation.allowed ?? knownDefectReason(story, violation, defects);
    if (allowed !== null) {
      tally.allowed.push({ story, rule: violation.rule, reason: allowed });
      continue;
    }
    tally.violations.push({
      story,
      rule: violation.rule,
      element: violation.element,
      detail: violation.detail,
    });
  }
}

/**
 * Имя файла итога. Доля входит в имя, потому что сводная работа сливает
 * каталоги всех шардов в один: совпавшие имена перезаписали бы друг друга.
 */
export function invariantsFileName(
  group: InvariantsGroup,
  width: number,
  theme: string,
  shard?: Shard,
): string {
  const part = shard === undefined ? '' : `-s${shard.index}of${shard.total}`;
  return `invariants-${group}${part}-${width}-${theme}.json`;
}

/** Пишет итог в каталог; каталог создаётся сам. Возвращает путь к файлу. */
export function writeInvariantsOutcome(
  dir: string,
  outcome: InvariantsOutcome,
  shard?: Shard,
): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, invariantsFileName(outcome.group, outcome.width, outcome.theme, shard));
  writeFileSync(path, `${JSON.stringify(outcome, null, 2)}\n`, 'utf8');
  return path;
}

/**
 * Строки для жёсткой проверки в конце теста — читаемый список, а не JSON.
 * Правила-политики сюда не попадают: они записаны в итог и видны сводке, но
 * тест ими не красится.
 */
export function describeViolations(tally: InvariantsTally): readonly string[] {
  return [
    ...tally.violations
      .filter((item) => !POLICY_RULES.has(item.rule))
      .map((item) => `${item.story} · ${item.rule} · ${item.element}: ${item.detail}`),
    ...tally.failed.map((item) => `${item.story} · отказ: ${item.reason}`),
  ];
}
