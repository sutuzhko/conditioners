'use client';

import { createContext, useContext } from 'react';

import type { DayKey } from '@/shared/lib/calendar';

import type { CrmEventDraft } from './model';
import type { ScheduleEdit } from './schedule';

/**
 * Действия календаря — то, что записи и пустые часы просят у страницы.
 *
 * 🔴 Контекст, а не пропсы, потому что сетка часов и клетки месяца рисуются
 * на сервере (инвариант 1), а функция границу сервер→клиент не переживает:
 * слот-проп из серверного компонента роняет рендер всей страницы. Клиентским
 * остаётся тонкий слой — управляющий `CalendarStage` сверху и листья снизу,
 * а сама сетка приходит из HTML готовой.
 */
export type CalendarActions = {
  /** Клик по пустому месту сетки: новое дело на этот час. */
  readonly create: (day: DayKey, fromMin?: number, toMin?: number) => void;
  /** Правка записи: дело своей формой, занятость — своей. */
  readonly edit: (edit: ScheduleEdit) => void;
  readonly remove: (edit: ScheduleEdit) => void;
  /** Перетаскивание и растягивание дела: те же поля, только время другое. */
  readonly move: (id: string, draft: CrmEventDraft) => void;
  /** Отметить занятость — своя, на выбранный день (ADR-115). */
  readonly block: (day: DayKey) => void;
  /** Номер записи, по которой идёт запрос: её кнопки на это время заперты. */
  readonly pending: string | null;
};

/**
 * Умолчание ничего не делает — и это осознанно.
 *
 * Запись обязана рисоваться и вне страницы: в Storybook и в тестах вокруг неё
 * нет ни диалогов, ни маршрутизатора. Бросать исключение значило бы, что
 * посмотреть запись отдельно нельзя, — а именно ради этого витрина и заведена.
 */
const IDLE: CalendarActions = {
  create: () => {},
  edit: () => {},
  remove: () => {},
  move: () => {},
  block: () => {},
  pending: null,
};

export const CalendarActionsContext = createContext<CalendarActions>(IDLE);

export function useCalendarActions(): CalendarActions {
  return useContext(CalendarActionsContext);
}
