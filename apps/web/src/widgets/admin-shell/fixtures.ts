/** Данные для историй и тестов сводки. */
import type { ReadinessSummary, SummaryCounts } from './AdminSummary';

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
