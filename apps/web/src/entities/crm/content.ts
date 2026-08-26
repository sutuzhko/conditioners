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
