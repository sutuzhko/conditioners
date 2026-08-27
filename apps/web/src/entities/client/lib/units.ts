/**
 * Техника клиента: сроки, гарантия и защита от дублей.
 *
 * Чистые функции — их зовут и слой данных (когда наряд закрывают и техника
 * появляется сама), и карточка клиента (когда владелец смотрит, что у
 * человека стоит). Общего у них ровно это: правило одно, а показывать и
 * записывать его — разная работа.
 */
import { dayKeyOf, type DayKey } from '@/shared/lib/calendar';

/** День момента времени в поясе работ. Дата монтажа — это день, а не час. */
export function dayOf(iso: string | Date): DayKey {
  return dayKeyOf(iso instanceof Date ? iso : new Date(iso));
}

/**
 * 🔴 Ежегодное обслуживание — третий источник денег компании и единственный,
 * который сглаживает сезонность (CRM.md §8.4). Год от монтажа — не выдумка
 * интерфейса, а срок, от которого считает вся отрасль.
 */
export const SERVICE_PERIOD_MONTHS = 12;

/** Сколько месяцев гарантии считаем осмысленным сроком: от месяца до десяти лет. */
const MIN_MONTHS = 1;
const MAX_MONTHS = 120;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Тот же день через N месяцев.
 *
 * Число прижимается к длине месяца: монтаж 31 января даёт гарантию до 28
 * февраля, а не до 3 марта, как вышло бы у сложения по дням. Считается по
 * ключу дня, а не по `Date`: ключ — это уже календарная дата в поясе работ,
 * и переводы часов её не двигают.
 */
export function shiftDayByMonths(day: DayKey, months: number): DayKey {
  const [year = 0, month = 1, date = 1] = day.split('-').map((part) => Number.parseInt(part, 10));

  const shifted = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(shifted / 12);
  const targetMonth = (shifted % 12) + 1;
  const targetDay = Math.min(date, daysInMonth(targetYear, targetMonth));

  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${String(targetYear).padStart(4, '0')}-${pad(targetMonth)}-${pad(targetDay)}`;
}

/** Годовщина монтажа: день, когда пора предлагать обслуживание. */
export function serviceDueDay(installDay: DayKey): DayKey {
  return shiftDayByMonths(installDay, SERVICE_PERIOD_MONTHS);
}

/** Последний день гарантии по сроку в месяцах. */
export function warrantyEndDay(installDay: DayKey, months: number): DayKey {
  return shiftDayByMonths(installDay, months);
}

/**
 * Гарантия кончилась.
 *
 * Сравниваются дни, а не моменты: гарантия «до 14 июля» действует весь день
 * четырнадцатого, и полночь по Гринвичу не имеет к этому отношения.
 */
export function warrantyOver(warrantyUntil: DayKey, today: DayKey): boolean {
  return warrantyUntil < today;
}

/* ---------- Срок гарантии из настроек ---------- */

/** Числительные словами: владелец пишет «год» и «три года», а не «12 мес.». */
const WORD_NUMBERS: Readonly<Record<string, number>> = {
  полгода: 0.5,
  полтора: 1.5,
  один: 1,
  одного: 1,
  два: 2,
  двух: 2,
  три: 3,
  трех: 3,
  четыре: 4,
  четырех: 4,
  пять: 5,
  пяти: 5,
  шесть: 6,
  шести: 6,
  семь: 7,
  семи: 7,
  восемь: 8,
  восьми: 8,
  девять: 9,
  девяти: 9,
  десять: 10,
  десяти: 10,
  двенадцать: 12,
};

const YEARS = String.raw`год|года|году|годов|лет|г\.`;
const MONTHS = String.raw`месяцев|месяца|месяц|мес\.|мес`;

/**
 * Разбор ведётся от единицы измерения назад к числу: только так «от 1 до 5
 * лет» читается как один срок с оговоркой, а не как единица и пятёрка.
 * Границы слов в Unicode `\b` не помогают — он определён по латинице, — их
 * заменяет запрет на продолжение слова.
 */
const TERM = new RegExp(
  String.raw`(?:(?<vague>от|до|более|свыше|около|примерно)\s+)?(?:(?<digits>\d+(?:[.,]\d+)?)|(?<word>[а-я]+))?\s*(?<unit>${MONTHS}|${YEARS})(?![а-я])`,
  'gu',
);

/**
 * Срок гарантии из настроек → месяцы. `null` — срок прочитать нельзя.
 *
 * 🔴 Ни одного значения по умолчанию: срок — факт о компании, он приходит из
 * настроек и нигде не подставляется кодом (инвариант 8). Неоднозначное «от 1
 * до 5 лет в зависимости от модели» — тоже `null`: выбрать за владельца, год
 * это или пять, значит пообещать человеку то, чего компания не обещала.
 * Пустая дата честнее выдуманной, и владелец проставит её руками.
 */
export function warrantyMonths(term: string): number | null {
  const text = term.trim().toLowerCase().replaceAll('ё', 'е');
  if (text === '') return null;

  let found: number | null = null;

  for (const match of text.matchAll(TERM)) {
    const { vague, digits, word, unit = '' } = match.groups ?? {};

    /* «до трёх лет» — обещание с оговоркой, а не срок: датой такое не станет. */
    if (vague !== undefined) return null;

    const amount =
      digits !== undefined
        ? Number.parseFloat(digits.replace(',', '.'))
        : (WORD_NUMBERS[word ?? ''] ?? 1);

    const months = Math.round(unit.startsWith('мес') ? amount : amount * 12);
    if (months < MIN_MONTHS || months > MAX_MONTHS) return null;

    /* Два разных срока в одном поле — тот же случай неоднозначности. */
    if (found !== null && found !== months) return null;
    found = months;
  }

  return found;
}

/**
 * Что завести по наряду: имена позиций минус то, что от этого наряда уже
 * записано.
 *
 * 🔴 Наряд закрывают, открывают и закрывают снова — техника от этого не
 * удваивается. Считаются именно повторы: два одинаковых блока в одной
 * квартире — это две записи, и «уже есть такая модель» их бы склеило.
 */
export function unitsToCreate<T>(
  positions: readonly T[],
  recorded: readonly string[],
  nameOf: (position: T) => string,
): readonly T[] {
  const key = (name: string): string => name.trim().toLowerCase();

  const left = new Map<string, number>();
  for (const name of recorded) left.set(key(name), (left.get(key(name)) ?? 0) + 1);

  const create: T[] = [];
  for (const position of positions) {
    const name = key(nameOf(position));
    const used = left.get(name) ?? 0;
    if (used > 0) {
      left.set(name, used - 1);
      continue;
    }
    create.push(position);
  }

  return create;
}
