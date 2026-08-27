/**
 * Тексты занятости.
 *
 * Живут рядом с сущностью, а не в фиче: занятость показывают и календарь, и
 * форма наряда, и оба обязаны называть одно и то же одинаково — «день закрыт»
 * в одном месте и «выходной» в другом читаются как разные вещи.
 */
import { type DayBusy, timeOfMinutes } from './lib/busy';

/** `14:00–16:00`. Тире длинное: это промежуток, а не дефис. */
export function busyWindowTitle(fromMin: number, toMin: number): string {
  return `${timeOfMinutes(fromMin)}–${timeOfMinutes(toMin)}`;
}

export const crmBusyContent = {
  /** Короткая метка в ячейке месяца: у неё есть ровно одна строка. */
  fullShort: 'Занят',
  full: 'День закрыт',
  /** Слово для метки отлучки в наложении занятости команды (ADR-123). */
  busy: 'Занятость',
  partial: 'Занят',
  free: 'Свободен',

  /** 🔴 Занятость предупреждает, а не запрещает: срочный ремонт в жару важнее запрета. */
  noteHint: 'Запись всё равно сохранится — решение за вами',
} as const;

/** Подпись занятости для скринридера и подсказки: «Занят весь день: семейные дела». */
export function busyTitle(busy: DayBusy): string {
  if (busy.state === 'free') return crmBusyContent.free;

  if (busy.state === 'full') {
    const reason = busy.reasons.join(', ');
    return reason === ''
      ? crmBusyContent.full
      : `${crmBusyContent.full}: ${reason.toLocaleLowerCase('ru-RU')}`;
  }

  const windows = busy.windows
    .map((window) => {
      const time = busyWindowTitle(window.fromMin, window.toMin);
      const reason = window.reasons.join(', ');
      return reason === '' ? time : `${time} — ${reason.toLocaleLowerCase('ru-RU')}`;
    })
    .join(', ');

  return `${crmBusyContent.partial} ${windows}`;
}

/**
 * Тексты пересечений по времени — CRM.md §8.5.
 *
 * Живут рядом с занятостью по той же причине: про наложенные выезды говорят и
 * календарь, и форма дела, и форма наряда, а «конфликт» в одном месте и
 * «пересечение» в другом читаются как разные вещи.
 */
export const crmClashContent = {
  /** Метка на записи в сетке. Слово короткое: место в ячейке одно. */
  mark: 'Пересечение',
  title: 'Это время уже занято',
  /** Сколько записей налезает друг на друга в колонке дня. */
  count: (count: number): string => `пересечений: ${count}`,

  /** 🔴 Пересечение предупреждает, а не запрещает (ADR-115). */
  hint: 'Запись всё равно сохранится — решение за вами',

  /** Загрузка колонки: «занято 6 ч 30 мин». */
  load: (title: string): string => `занято ${title}`,
  loadFree: 'свободно',
} as const;

/** «6 ч 30 мин», «45 мин», «3 ч». Часы и минуты — как их называет владелец. */
export function loadTitle(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} мин`;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
}
