/**
 * Разрешение занятости: занят ли человек в этот день и в какие часы.
 *
 * Ядро задачи «когда меня нет». Записей на один день бывает несколько —
 * постоянный выходной по средам плюс запись к врачу в ту же среду, — и ответ
 * собирается из всех сразу: окна складываются, пересечения объединяются.
 *
 * 🔴 Чистая функция в домене, а не в компоненте: тот же ответ нужен и сетке
 * месяца, и панели дня, и предупреждению в форме наряда. Второй расчёт в
 * разметке разошёлся бы с первым на первой же правке.
 */
import { type DayKey, weekdayOf } from '@/shared/lib/calendar';

import { MINUTES_IN_DAY, type DayBlockRepeat } from '../model';

/** Занятость в том виде, в каком её читает разрешение. */
export type DayBlockLike = {
  readonly repeat: DayBlockRepeat;
  /** Разовая: календарная дата. У повторяемой пусто. */
  readonly day: DayKey | null;
  /** Повторяемая: день недели по ISO-8601, 1 — понедельник … 7 — воскресенье. */
  readonly weekday: number | null;
  /** Окно в минутах от полуночи по московскому времени. Оба пусты — весь день. */
  readonly fromMin: number | null;
  readonly toMin: number | null;
  readonly reason: string | null;
};

/** Промежуток занятости с причинами, которые его дали. */
export type BusyWindow = {
  readonly fromMin: number;
  readonly toMin: number;
  /** Причины слившихся записей: «врач» и «школа» на одном промежутке. */
  readonly reasons: readonly string[];
};

/**
 * Ответ на вопрос «занят ли». Дискриминированное объединение, а не флаги:
 * «занят весь день» и «занят с 14:00 до 16:00» — разные ответы, и день,
 * закрытый на два часа, остаётся рабочим.
 */
export type DayBusy =
  | { readonly state: 'free' }
  | { readonly state: 'full'; readonly reasons: readonly string[] }
  | { readonly state: 'partial'; readonly windows: readonly BusyWindow[] };

/** `14:30` → 870. Форма вводит время, хранится и считается оно минутами. */
export function minutesOfTime(time: string): number {
  const [hour = 0, minute = 0] = time.split(':').map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
  return Math.min(Math.max(hour * 60 + minute, 0), MINUTES_IN_DAY - 1);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** 870 → `14:30`. Обратный перевод для подписи и для значения поля времени. */
export function timeOfMinutes(minutes: number): string {
  const inDay = Math.min(Math.max(Math.trunc(minutes), 0), MINUTES_IN_DAY - 1);
  return `${pad(Math.floor(inDay / 60))}:${pad(inDay % 60)}`;
}

/**
 * Занятость, попадающая на этот день: разовая — совпадением даты,
 * повторяемая — совпадением дня недели.
 *
 * Тип записи возвращается тот же, что пришёл: панели дня нужны и номер записи,
 * и чья она, а разрешению занятости — нет.
 */
export function blocksOn<Block extends DayBlockLike>(
  day: DayKey,
  blocks: readonly Block[],
): readonly Block[] {
  const weekday = weekdayOf(day);

  const applied = blocks.filter((block) =>
    block.repeat === 'weekly' ? block.weekday === weekday : block.day === day,
  );

  // закрытый целиком день идёт первым: у него нет начала, и `null` сортируется
  // как «раньше нуля» — иначе он оказывался бы в хвосте списка дня
  return [...applied].sort((left, right) => (left.fromMin ?? -1) - (right.fromMin ?? -1));
}

/** Причины без повторов и без пустых: одна и та же причина дважды ничего не добавляет. */
function reasonsOf(blocks: readonly DayBlockLike[]): readonly string[] {
  return [...new Set(blocks.map((block) => block.reason).filter((reason) => reason !== null))];
}

/**
 * Слияние окон. Соприкасающиеся тоже сливаются: занятость с 10 до 12 и с 12 до
 * 14 — это один промежуток без перерыва, и показывать его двумя строчками
 * значит заставлять читателя складывать их в уме.
 */
function mergeWindows(windows: readonly BusyWindow[]): readonly BusyWindow[] {
  const sorted = [...windows].sort((left, right) => left.fromMin - right.fromMin);
  const merged: BusyWindow[] = [];

  for (const window of sorted) {
    const last = merged[merged.length - 1];

    if (last === undefined || window.fromMin > last.toMin) {
      merged.push(window);
      continue;
    }

    merged[merged.length - 1] = {
      fromMin: last.fromMin,
      toMin: Math.max(last.toMin, window.toMin),
      reasons: [...new Set([...last.reasons, ...window.reasons])],
    };
  }

  return merged;
}

/**
 * Занят ли человек в этот день — и если да, то целиком или в какие часы.
 *
 * Запись без окна закрывает день целиком и перебивает любые часовые: если
 * человека нет весь день, уточнение «а с 14 до 16 особенно нет» ничего не
 * меняет.
 *
 * 🔴 Записи подаются **одного человека**. Занятость личная, и окна разных
 * людей складывать нельзя: «Дмитрий с 10 до 12» и «Сергей с 11 до 14» — это
 * два занятых человека, а не один занятый с 10 до 14.
 */
export function busyOn(day: DayKey, blocks: readonly DayBlockLike[]): DayBusy {
  const applied = blocksOn(day, blocks);
  if (applied.length === 0) return { state: 'free' };

  const wholeDay = applied.filter((block) => block.fromMin === null || block.toMin === null);
  if (wholeDay.length > 0) return { state: 'full', reasons: reasonsOf(wholeDay) };

  const windows = applied.map((block) => ({
    fromMin: block.fromMin ?? 0,
    toMin: block.toMin ?? MINUTES_IN_DAY - 1,
    reasons: reasonsOf([block]),
  }));

  return { state: 'partial', windows: mergeWindows(windows) };
}

/**
 * Попадает ли время в занятое окно — для предупреждения в форме дела и наряда.
 *
 * Закрытый целиком день занят в любую минуту; у частичной занятости граница
 * конца открытая: дело на 16:00 после окна «14:00–16:00» ни с чем не спорит.
 */
export function busyAt(busy: DayBusy, minutes: number): boolean {
  if (busy.state === 'free') return false;
  if (busy.state === 'full') return true;

  return busy.windows.some((window) => minutes >= window.fromMin && minutes < window.toMin);
}
