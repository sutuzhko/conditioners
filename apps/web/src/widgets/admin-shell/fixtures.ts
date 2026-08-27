/** Данные для историй и тестов сводки. */
import type { ReadinessSummary, SummaryCounts, UpcomingItem } from './AdminSummary';

export const quietCounts: SummaryCounts = {
  newLeads: 0,
  activeOrders: 2,
  clients: 34,
  installers: 2,
  pendingReviews: 0,
};

export const busyCounts: SummaryCounts = {
  newLeads: 3,
  activeOrders: 7,
  clients: 118,
  installers: 3,
  pendingReviews: 2,
};

/** Пустой сайт: сразу после установки не заведено ничего. */
export const emptyCounts: SummaryCounts = {
  newLeads: 0,
  activeOrders: 0,
  clients: 0,
  installers: 0,
  pendingReviews: 0,
};

export const readyReadiness: ReadinessSummary = { ready: true, unfinished: [] };

export const unfinishedReadiness: ReadinessSummary = {
  ready: false,
  unfinished: ['company', 'contacts', 'address', 'legal'],
};

/** Наряды и дела вперемешку по времени, включая одно просроченное. */
export const upcomingItems: readonly UpcomingItem[] = [
  {
    id: 'e1',
    nature: 'event',
    when: 'вчера 14:00',
    kind: 'Звонок',
    clientName: 'Сергей',
    href: '/admin/crm',
    overdue: true,
  },
  {
    id: 'o1',
    nature: 'order',
    when: 'сегодня 09:00',
    kind: 'Монтаж',
    clientName: 'Ирина Соколова',
    href: '/admin/orders/o1',
    overdue: false,
  },
  {
    id: 'e2',
    nature: 'event',
    when: 'сегодня 18:00',
    kind: 'Замер',
    clientName: 'Ирина',
    href: '/admin/crm',
    overdue: false,
  },
  {
    id: 'o2',
    nature: 'order',
    when: 'завтра 10:00',
    kind: 'ТО',
    clientName: 'Ольга Кузьмина',
    href: '/admin/orders/o2',
    overdue: false,
  },
];

/** Только просроченное: так выглядит неделя, до которой не дошли руки. */
export const overdueItems: readonly UpcomingItem[] = upcomingItems.filter((item) => item.overdue);
