import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Shard } from './shard';

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
  /**
   * sha1 кадра по истории — только при `VR_DUPLICATES=1` (issue #464). Одинаковый
   * кадр у историй про разные состояния — дыра покрытия: кадр не видит того,
   * чем они различаются (ADR-230). Сводка показывает такие группы диагностикой,
   * не крася; без переменной поле пустое.
   */
  readonly hashes: Readonly<Record<string, string>>;
  /**
   * Сколько историй пары не снималось, потому что правка до них не дотягивается
   * по графу импортов (issue #444). Без списка изменённых файлов — ноль: тогда
   * снимается всё.
   */
  readonly skipped: number;
};

export type ErrorKind = 'changed' | 'new' | 'failed';

/** Накопитель по ходу теста; в файл уходит вместе с проектом, шириной и темой. */
export type OutcomeTally = {
  compared: number;
  readonly changed: string[];
  readonly new: string[];
  readonly failed: StoryFailure[];
  readonly hashes: Record<string, string>;
  skipped: number;
};

export function emptyTally(): OutcomeTally {
  return { compared: 0, changed: [], new: [], failed: [], hashes: {}, skipped: 0 };
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
  if (message.includes("A snapshot doesn't exist")) return 'new';

  /* 🔴 Признаки взяты из настоящих сообщений, а не из исходников Playwright.
     Первая редакция искала `Screenshot comparison failed` — строку из
     matchers/expect.js — и не совпала ни разу: прогон 33403324410 показал,
     что сообщение начинается с `expect(page).toHaveScreenshot(expected)
     failed`, а различие описывают строки `… pixels … are different` (разные
     точки) и `Expected an image …` (разный размер кадра). Сорок настоящих
     расхождений легли в «Отказы», и ярлык принятия на них не действовал.
     Старый признак оставлен: у других версий Playwright сообщение прежнее.
     Таймаут ожидания устойчивого кадра ни под один признак не попадает и
     честно остаётся отказом. */
  if (
    message.includes('Screenshot comparison failed') ||
    message.includes('are different') ||
    message.includes('Expected an image')
  ) {
    return 'changed';
  }

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

/**
 * Управляющие последовательности раскраски терминала. Playwright красит текст
 * `expect` даже без терминала, а причина отказа уходит в JSON и оттуда — в
 * markdown сводки, где `\u001b[31m` превращается в мусор между словами.
 */
const ANSI = /\u001b\[[0-9;]*m/g;

/** Причина отказа — первые строки сообщения без раскраски: дальше идёт стек, он в сводке не нужен. */
export function firstLines(message: string): string {
  return message
    .replace(ANSI, '')
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
  shard?: Shard,
): string {
  /* Шард — часть имени, а не поле итога: работа пайплайна сливает каталоги
     итогов всех шардов в один, и совпадающие имена перезаписали бы друг
     друга — сводка молча потеряла бы целые пары «ширина + тема». */
  const part = shard === undefined ? '' : `-s${shard.index}of${shard.total}`;
  return `outcome-${project}${part}-${width}-${theme}.json`;
}

/** Пишет итог в каталог; возвращает путь к файлу. Каталог создаётся сам. */
export function writeOutcome(dir: string, outcome: RunOutcome, shard?: Shard): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, outcomeFileName(outcome.project, outcome.width, outcome.theme, shard));
  writeFileSync(path, `${JSON.stringify(outcome, null, 2)}\n`, 'utf8');
  return path;
}
