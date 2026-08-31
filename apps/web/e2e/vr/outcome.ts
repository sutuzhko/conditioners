import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Машинный итог прогона снимков — то, по чему работа пайплайна решает, красить
 * PR или нет (ADR-230).
 *
 * 🔴 Раньше вердикт читался из кода возврата Playwright, и он не различал
 * «кадр разошёлся с эталоном» и «сценарий истории отказал». Теперь эталон —
 * кадры `merge-base`, а расхождение кадра автор вправе принять ярлыком на PR;
 * отказ сценария принять нельзя ничем. Значит работе нужны категории, а не код
 * возврата, и категории раскладывает раннер — он один знает, что именно
 * случилось с каждой историей.
 *
 * Модуль намеренно не импортирует Playwright: классификация — чистая функция,
 * и её проверяет vitest без браузера.
 */

export type StoryFailure = {
  readonly story: string;
  readonly reason: string;
};

/**
 * Итог одного теста — пары «ширина + тема» одного проекта. Ключ `new` задан
 * контрактом с работой пайплайна: он читает файл, а не тип.
 */
export type RunOutcome = {
  readonly project: 'public' | 'panel';
  readonly width: number;
  readonly theme: string;
  /** Сколько раз вызывалось сравнение с эталоном. */
  readonly compared: number;
  /** Истории, чей кадр разошёлся с эталоном — их принимает ярлык. */
  readonly changed: readonly string[];
  /** Истории без эталона: их нет в базе сравнения либо не было кадра. */
  readonly new: readonly string[];
  /** Всё остальное — отказ сценария, таймаут, ошибка навигации. Красит всегда. */
  readonly failed: readonly StoryFailure[];
};

export type ErrorKind = 'changed' | 'new' | 'failed';

/** Накопитель по ходу теста; в файл уходит вместе с проектом, шириной и темой. */
export type OutcomeTally = {
  compared: number;
  readonly changed: string[];
  readonly new: string[];
  readonly failed: StoryFailure[];
};

export function emptyTally(): OutcomeTally {
  return { compared: 0, changed: [], new: [], failed: [] };
}

/**
 * Категория ошибки по сообщению Playwright.
 *
 * Сообщения — часть его публичного вывода, другого признака у мягкой проверки
 * нет: `toHaveScreenshot` не возвращает результата, а только записывает ошибку
 * в `test.info().errors`. Отсутствующий эталон — не расхождение: так бывает,
 * когда правка меняет теги `vr-<ширина>` и у истории появляется ширина,
 * которой в базе не снимали.
 */
export function classifyError(message: string): ErrorKind {
  if (message.includes('Screenshot comparison failed')) return 'changed';
  if (message.includes("A snapshot doesn't exist")) return 'new';
  return 'failed';
}

/** Раскладывает ошибки одной истории по категориям, не дублируя историю в списке. */
export function recordErrors(
  tally: OutcomeTally,
  story: string,
  messages: readonly string[],
): void {
  for (const message of messages) {
    const kind = classifyError(message);
    if (kind === 'failed') {
      tally.failed.push({ story, reason: firstLines(message) });
      continue;
    }
    const bucket = kind === 'changed' ? tally.changed : tally.new;
    if (!bucket.includes(story)) bucket.push(story);
  }
}

/** Причина отказа — первые строки сообщения: дальше идёт стек, он в сводке не нужен. */
export function firstLines(message: string): string {
  return message
    .split('\n')
    .slice(0, 3)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ');
}

export function outcomeFileName(
  project: RunOutcome['project'],
  width: number,
  theme: string,
): string {
  return `outcome-${project}-${width}-${theme}.json`;
}

/** Пишет итог в каталог; возвращает путь к файлу. Каталог создаётся сам. */
export function writeOutcome(dir: string, outcome: RunOutcome): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, outcomeFileName(outcome.project, outcome.width, outcome.theme));
  writeFileSync(path, `${JSON.stringify(outcome, null, 2)}\n`, 'utf8');
  return path;
}
