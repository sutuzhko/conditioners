/** Данные для историй и тестов сводки. */
import type {
  AttentionItem,
  MoneySummary,
  ReadinessSummary,
  SummaryCounts,
  UpcomingItem,
  WorkCounts,
} from './AdminSummary';

/** Период, за который посчитаны числа историй. */
export const summaryPeriod = 'Август 2026';

export const quietCounts: SummaryCounts = {
  newLeads: 0,
  activeOrders: 2,
  revenue: 96_400,
  pendingReviews: 0,
};

export const busyCounts: SummaryCounts = {
  newLeads: 3,
  activeOrders: 7,
  revenue: 486_200,
  pendingReviews: 2,
};

/** Пустой сайт: сразу после установки не заведено ничего. */
export const emptyCounts: SummaryCounts = {
  newLeads: 0,
  activeOrders: 0,
  revenue: 0,
  pendingReviews: 0,
};

export const workCounts: WorkCounts = { done: 38, active: 9, fresh: 4, installers: 3 };

/** Месяц, в котором ещё ничего не закрыто: сегмент обязан показать это честно. */
export const emptyWork: WorkCounts = { done: 0, active: 0, fresh: 0, installers: 1 };

/** 🔴 Строки срыва: время вышло или ехать некому. */
export const attentionItems: readonly AttentionItem[] = [
  {
    id: 'o9',
    title: 'Монтаж · Дмитрий Лапшин',
    note: 'Пётр Кузнецов · Тула, Оборонная 12, кв. 34',
    href: '/admin/orders/o9',
    reason: 'overdue',
  },
  {
    id: 'o8',
    title: 'Обслуживание · ООО «Тулаторг»',
    note: 'Тула, пр. Ленина 108, офис 312',
    href: '/admin/orders/o8',
    reason: 'unassigned',
  },
];

export const moneySummary: MoneySummary = {
  revenue: 486_200,
  average: 12_800,
  payout: 132_000,
  cash: 74_500,
  shares: [
    { title: 'Монтаж', sum: 311_400, percent: 64 },
    { title: 'Обслуживание', sum: 118_700, percent: 24 },
    { title: 'Ремонт', sum: 56_100, percent: 12 },
  ],
  weeks: [
    { label: '1–7', sum: 96_400 },
    { label: '8–14', sum: 142_800 },
    { label: '15–21', sum: 118_500 },
    { label: '22–…', sum: 128_500 },
  ],
};

/** Ни одного закрытого наряда: график рисовать нечем, и блок это говорит. */
export const emptyMoney: MoneySummary = {
  revenue: 0,
  average: 0,
  payout: 0,
  cash: 0,
  shares: [],
  weeks: [
    { label: '1–7', sum: 0 },
    { label: '8–14', sum: 0 },
    { label: '15–21', sum: 0 },
    { label: '22–…', sum: 0 },
  ],
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
