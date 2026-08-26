/**
 * Календарная арифметика для панели управления.
 *
 * 🔴 Всё считается в часовом поясе города работ, а не браузера. Владелец может
 * открыть панель из отпуска в другом поясе — монтаж от этого не переезжает на
 * другой день. По той же причине сетка месяца строится здесь, на сервере:
 * страница обязана приходить готовой (инвариант 1).
 *
 * Дата дела хранится моментом времени (UTC). Человеку она показывается и
 * вводится в местном времени, и переводы туда-обратно живут только тут.
 */

/** Часовой пояс работ. Тула — московское время, без перехода на летнее. */
export const WORK_TIME_ZONE = 'Europe/Moscow';

/** Ключ дня: `2026-08-23`. Он же значение `input[type=date]`. */
export type DayKey = string;

/** Ключ месяца: `2026-08`. Он же параметр адреса — месяц можно дать ссылкой. */
export type MonthKey = string;

export type CalendarDay = {
  readonly key: DayKey;
  /** Число месяца для подписи ячейки. */
  readonly day: number;
  /** День принадлежит показываемому месяцу, а не хвосту соседнего. */
  readonly inMonth: boolean;
};

const DAY_MS = 86_400_000;
/** Шесть недель всегда: иначе сетка прыгает по высоте при листании месяцев. */
const WEEKS = 6;
const WEEK_DAYS = 7;

/** Форматы дороги в создании, а вызываются на каждой ячейке сетки. */
const formats = new Map<string, Intl.DateTimeFormat>();

function formatFor(timeZone: string): Intl.DateTimeFormat {
  const ready = formats.get(timeZone);
  if (ready !== undefined) return ready;

  const format = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  });
  formats.set(timeZone, format);
  return format;
}

type Parts = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
};

function partsIn(at: Date, timeZone: string): Parts {
  const parts = formatFor(timeZone).formatToParts(at);

  const take = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value ?? '0';
    return Number.parseInt(value, 10);
  };

  // `hour12: false` в некоторых движках даёт «24» вместо «00» для полуночи
  const hour = take('hour') % 24;

  return {
    year: take('year'),
    month: take('month'),
    day: take('day'),
    hour,
    minute: take('minute'),
    second: take('second'),
  };
}

/**
 * Смещение пояса в минутах в конкретный момент.
 *
 * Считается сравнением «который час там» с «который час по UTC», а не
 * константой +3: константа переживёт ровно до следующей смены закона о
 * времени, а таких смен в стране было три за двадцать лет.
 */
function offsetMinutes(at: Date, timeZone: string): number {
  const local = partsIn(at, timeZone);
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );
  return (asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** День момента времени в поясе работ: `2026-08-23`. */
export function dayKeyOf(at: Date, timeZone: string = WORK_TIME_ZONE): DayKey {
  const local = partsIn(at, timeZone);
  return `${local.year}-${pad(local.month)}-${pad(local.day)}`;
}

/** Время момента в поясе работ: `14:30`. Значение `input[type=time]`. */
export function timeOf(at: Date, timeZone: string = WORK_TIME_ZONE): string {
  const local = partsIn(at, timeZone);
  return `${pad(local.hour)}:${pad(local.minute)}`;
}

/** Месяц момента времени: `2026-08`. */
export function monthKeyOf(at: Date, timeZone: string = WORK_TIME_ZONE): MonthKey {
  return dayKeyOf(at, timeZone).slice(0, 7);
}

/** Месяц, которому принадлежит день. */
export function monthOfDay(day: DayKey): MonthKey {
  return day.slice(0, 7);
}

/**
 * Разбор ключа месяца из адреса. Возвращает `null` на любом мусоре: параметр
 * приходит от пользователя, и `2026-13` не должно давать тринадцатый месяц.
 */
export function parseMonthKey(value: string): MonthKey | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (match === null) return null;

  const year = Number.parseInt(match[1] ?? '', 10);
  const month = Number.parseInt(match[2] ?? '', 10);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;

  return `${year}-${pad(month)}`;
}

/** Разбор ключа дня из адреса. Проверяет и существование числа: 31 февраля нет. */
export function parseDayKey(value: string): DayKey | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;

  const year = Number.parseInt(match[1] ?? '', 10);
  const month = Number.parseInt(match[2] ?? '', 10);
  const day = Number.parseInt(match[3] ?? '', 10);
  if (parseMonthKey(`${match[1]}-${match[2]}`) === null) return null;

  const at = new Date(Date.UTC(year, month - 1, day));
  if (at.getUTCMonth() !== month - 1 || at.getUTCDate() !== day) return null;

  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * День недели по ISO-8601: 1 — понедельник … 7 — воскресенье.
 *
 * 🔴 Считается по самому ключу дня, а не через `getDay()` у `Date`: ключ — это
 * уже календарная дата в поясе работ, а `getDay()` вернул бы день недели в
 * поясе машины, и у контейнера в UTC постоянный выходной по средам уезжал бы
 * на вторник в первые три часа суток (ADR-080).
 */
export function weekdayOf(day: DayKey): number {
  const [year = 0, month = 1, date = 1] = day.split('-').map((part) => Number.parseInt(part, 10));
  const at = new Date(Date.UTC(year, month - 1, date));
  // getUTCDay: 0 — воскресенье; ISO-8601 считает с понедельника и с единицы
  return ((at.getUTCDay() + 6) % 7) + 1;
}

/** Соседний месяц: `shiftMonth('2026-01', -1) === '2025-12'`. */
export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [year = 0, index = 1] = month.split('-').map((part) => Number.parseInt(part, 10));
  const at = new Date(Date.UTC(year, index - 1 + delta, 1));
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}`;
}

/**
 * Сетка месяца: шесть недель с понедельника, с хвостами соседних месяцев.
 *
 * Хвосты нужны настоящие, а не пустые ячейки: монтаж 1 сентября виден в конце
 * августовской сетки, и это ровно то, ради чего в календарь смотрят.
 *
 * 🔴 Сетка не знает нерабочих дней. Суббота и воскресенье здесь такие же дни,
 * как остальные: у монтажа нормированного графика нет, работа идёт в выходные,
 * а отдых приходится на будни. Какой день нерабочий, говорит занятость,
 * заведённая человеком, — календарь этого не решает.
 */
export function monthGrid(month: MonthKey): readonly (readonly CalendarDay[])[] {
  const [year = 0, index = 1] = month.split('-').map((part) => Number.parseInt(part, 10));
  const first = new Date(Date.UTC(year, index - 1, 1));

  // getUTCDay: 0 — воскресенье. Неделя начинается с понедельника.
  const lead = (first.getUTCDay() + 6) % 7;
  const start = first.getTime() - lead * DAY_MS;

  return Array.from({ length: WEEKS }, (_, week) =>
    Array.from({ length: WEEK_DAYS }, (_, weekday) => {
      const at = new Date(start + (week * WEEK_DAYS + weekday) * DAY_MS);
      const day = at.getUTCDate();

      return {
        key: `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(day)}`,
        day,
        inMonth: at.getUTCMonth() === index - 1 && at.getUTCFullYear() === year,
      };
    }),
  );
}

/**
 * Границы месячной сетки моментами времени — по ним отбираются дела из базы.
 *
 * Границы шире месяца ровно потому, что сетка шире месяца: дела из хвостов
 * должны быть видны, иначе последняя строка календаря всегда пустая.
 */
export function gridRange(
  month: MonthKey,
  timeZone: string = WORK_TIME_ZONE,
): { readonly from: Date; readonly to: Date } {
  const weeks = monthGrid(month);
  const first = weeks[0]?.[0]?.key ?? `${month}-01`;
  const last = weeks[weeks.length - 1]?.[WEEK_DAYS - 1]?.key ?? `${month}-01`;

  return {
    from: momentOf(first, '00:00', timeZone),
    to: new Date(momentOf(last, '00:00', timeZone).getTime() + DAY_MS),
  };
}

/** Границы одного дня — по ним отбираются дела для списка. */
export function dayRange(
  day: DayKey,
  timeZone: string = WORK_TIME_ZONE,
): { readonly from: Date; readonly to: Date } {
  const from = momentOf(day, '00:00', timeZone);
  return { from, to: new Date(from.getTime() + DAY_MS) };
}

/**
 * Местные дата и время → момент времени.
 *
 * Смещение берётся на самой искомой дате, а не на «сейчас»: иначе дело,
 * назначенное на другую сторону перевода часов, уезжает на час. Два прохода —
 * первый даёт приблизительный момент, второй уточняет смещение уже на нём.
 */
export function momentOf(day: DayKey, time: string, timeZone: string = WORK_TIME_ZONE): Date {
  const [year = 0, month = 1, date = 1] = day.split('-').map((part) => Number.parseInt(part, 10));
  const [hour = 0, minute = 0] = time.split(':').map((part) => Number.parseInt(part, 10));

  const asUtc = Date.UTC(year, month - 1, date, hour, minute);
  const rough = new Date(asUtc - offsetMinutes(new Date(asUtc), timeZone) * 60_000);
  return new Date(asUtc - offsetMinutes(rough, timeZone) * 60_000);
}

/** Сегодня в поясе работ. Отдельной функцией — чтобы тесты могли задать «сейчас». */
export function todayKey(now: Date = new Date(), timeZone: string = WORK_TIME_ZONE): DayKey {
  return dayKeyOf(now, timeZone);
}
