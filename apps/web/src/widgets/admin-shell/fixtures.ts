/** Данные для историй и тестов сводки. */
import type { ReadinessSummary, SummaryCounts, UpcomingEvent } from './AdminSummary';

export const quietCounts: SummaryCounts = {
  newLeads: 0,
  pendingReviews: 0,
  models: 4,
  articles: 6,
};

export const busyCounts: SummaryCounts = {
  newLeads: 3,
  pendingReviews: 2,
  models: 12,
  articles: 9,
};

/** Пустой сайт: сразу после установки не заполнено ничего. */
export const emptyCounts: SummaryCounts = {
  newLeads: 0,
  pendingReviews: 0,
  models: 0,
  articles: 0,
};

export const readyReadiness: ReadinessSummary = { ready: true, unfinished: [] };

export const unfinishedReadiness: ReadinessSummary = {
  ready: false,
  unfinished: ['company', 'contacts', 'address', 'legal'],
};

/** Дела на ближайшие дни, включая одно просроченное. */
export const upcomingEvents: readonly UpcomingEvent[] = [
  {
    id: 'e1',
    when: 'вчера 14:00',
    kind: 'Звонок',
    clientName: 'Сергей',
    overdue: true,
  },
  { id: 'e2', when: 'сегодня 18:00', kind: 'Замер', clientName: 'Ирина', overdue: false },
  { id: 'e3', when: 'завтра 10:00', kind: 'Монтаж', clientName: 'Ольга', overdue: false },
];
