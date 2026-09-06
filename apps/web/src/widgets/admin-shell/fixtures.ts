/** Данные для историй и тестов сводки. */
import type {
  AttentionItem,
  MoneySummary,
  ReadinessSummary,
  SummaryCharts,
  SummaryCounts,
  SummaryHead,
  SummaryUpcoming,
  UpcomingItem,
  WorkCounts,
} from './AdminSummary';
import { adminSummaryContent as texts } from './summary-content';
import { DEFAULT_UPCOMING_FILTERS, type UpcomingFilters } from './summary-list';
import { overviewDeltas, type SummaryDeltas } from './summary-tiles';

/** Период, за который посчитаны числа историй. */
export const summaryPeriod = 'Август 2026';

/** Шапка: приветствие и строка дня. Собраны так же, как их собирает страница. */
export const summaryHead: SummaryHead = {
  greeting: 'Доброе утро, Сергей',
  dayLine: 'Среда, 29 августа · 3 выезда сегодня',
};

export const quietCounts: SummaryCounts = {
  newLeads: 0,
  activeOrders: 2,
  revenue: 96_400,
  retained: 74_200,
};

export const busyCounts: SummaryCounts = {
  newLeads: 3,
  activeOrders: 7,
  revenue: 486_200,
  retained: 354_200,
};

/** Пустой сайт: сразу после установки не заведено ничего. */
export const emptyCounts: SummaryCounts = {
  newLeads: 0,
  activeOrders: 0,
  revenue: 0,
  retained: 0,
};

/** Спокойное утро: сравнивать почти не с чем, тревожить нечем. */
export const quietDeltas: SummaryDeltas = overviewDeltas({
  staleLeadHours: null,
  ordersFlow: 2,
  ordersFlowBefore: 2,
  revenue: 96_400,
  revenueBefore: 91_300,
  retained: 74_200,
});

/** Обращение висит вторые сутки, поток нарядов вырос, выручка тоже. */
export const busyDeltas: SummaryDeltas = overviewDeltas({
  staleLeadHours: 29,
  ordersFlow: 9,
  ordersFlowBefore: 7,
  revenue: 486_200,
  revenueBefore: 445_000,
  retained: 354_200,
});

/** Пустой сайт: сравнивать не с чем вовсе, и ни одного чипа не рисуется. */
export const emptyDeltas: SummaryDeltas = overviewDeltas({
  staleLeadHours: null,
  ordersFlow: 0,
  ordersFlowBefore: 0,
  revenue: 0,
  revenueBefore: 0,
  retained: 0,
});

/** Числа выдуманы для витрины: настоящие приходят из БД (инвариант 8). */
export const summaryCharts: SummaryCharts = {
  weeks: {
    labels: ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35'],
    values: [9, 14, 11, 7, 16, 12, 10, 5, 18, 15, 13, 11],
  },
  revenue: {
    labels: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг'],
    values: [412_000, 448_000, 396_000, 512_000, 588_000, 664_000, 690_000, 634_000],
  },
  payout: [96_000, 102_000, 91_000, 118_000, 134_000, 149_000, 158_000, 144_000],
};

/** Месяц, в котором ещё ничего не закрыто: график рисовать нечем. */
export const emptyCharts: SummaryCharts = {
  weeks: { labels: summaryCharts.weeks.labels, values: summaryCharts.weeks.labels.map(() => 0) },
  revenue: {
    labels: summaryCharts.revenue.labels,
    values: summaryCharts.revenue.labels.map(() => 0),
  },
  payout: summaryCharts.revenue.labels.map(() => 0),
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

const calendarDay = { pathname: '/admin/crm', query: { day: '2026-08-29', view: 'day' } };

/** Наряды и дела вперемешку по времени, включая одно просроченное. */
export const upcomingItems: readonly UpcomingItem[] = [
  {
    id: 'e1',
    nature: 'event',
    at: '2026-08-28T11:00:00.000Z',
    day: 'чт, 28',
    clock: '14:00 · 1 ч',
    kind: 'Звонок',
    place: 'Сергей Данилов · Тула, Первомайская 12',
    clientName: 'Сергей Данилов',
    clientPhone: '+7 (910) 155-24-68',
    installerName: null,
    statusTitle: 'Просрочен',
    statusVariant: 'danger',
    sum: null,
    href: calendarDay,
    dayHref: calendarDay,
    number: null,
    overdue: true,
  },
  {
    id: 'o1',
    nature: 'order',
    at: '2026-08-29T06:00:00.000Z',
    day: 'сегодня',
    clock: '09:00 · 3 ч',
    kind: 'Монтаж',
    place: 'Ирина Соколова · Тула, Оборонная 12, кв. 34',
    clientName: 'Ирина Соколова',
    clientPhone: '+7 (910) 155-24-69',
    installerName: 'Пётр Кузнецов',
    statusTitle: 'В работе',
    statusVariant: 'accent',
    sum: texts.money(34_900),
    href: { pathname: '/admin/orders/o1' },
    dayHref: calendarDay,
    number: 1059,
    overdue: false,
  },
  {
    id: 'e2',
    nature: 'event',
    at: '2026-08-29T15:00:00.000Z',
    day: 'сегодня',
    clock: '18:00 · 1 ч',
    kind: 'Замер',
    place: 'Ирина Белова · Новомосковск, Березовая 4',
    clientName: 'Ирина Белова',
    clientPhone: null,
    installerName: null,
    statusTitle: 'Запланировано',
    statusVariant: 'neutral',
    sum: null,
    href: calendarDay,
    dayHref: calendarDay,
    number: null,
    overdue: false,
  },
  {
    id: 'o2',
    nature: 'order',
    at: '2026-08-30T07:00:00.000Z',
    day: 'завтра',
    clock: '10:00 · 4 ч',
    kind: 'ТО',
    place: 'Ольга Кузьмина · Щёкино, Пионерская 4',
    clientName: 'Ольга Кузьмина',
    clientPhone: '+7 (910) 155-24-70',
    installerName: null,
    statusTitle: 'Новый',
    statusVariant: 'neutral',
    sum: texts.money(8_400),
    href: { pathname: '/admin/orders/o2' },
    dayHref: calendarDay,
    number: 1060,
    overdue: false,
  },
];

/** Только просроченное: так выглядит неделя, до которой не дошли руки. */
export const overdueItems: readonly UpcomingItem[] = upcomingItems.filter((item) => item.overdue);

/** Список с отбором по умолчанию: одна страница, ничего не снято. */
export function upcomingOf(
  items: readonly UpcomingItem[],
  filters: UpcomingFilters = DEFAULT_UPCOMING_FILTERS,
): SummaryUpcoming {
  return { items, filters, total: items.length, page: 1, pages: 1 };
}

/** Отобранный список: применённое условие остаётся видимым плашкой. */
export const filteredUpcoming: SummaryUpcoming = {
  items: overdueItems,
  filters: { ...DEFAULT_UPCOMING_FILTERS, show: 'overdue', query: 'Оборонная' },
  total: 1,
  page: 1,
  pages: 1,
};

/** Длинный список: разбивка на страницы показывается только здесь. */
export const pagedUpcoming: SummaryUpcoming = {
  items: upcomingItems,
  filters: DEFAULT_UPCOMING_FILTERS,
  total: 24,
  page: 2,
  pages: 3,
};
