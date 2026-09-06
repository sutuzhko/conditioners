/**
 * Числа сегмента «Обзор»: два графика первого экрана и сравнения для чипов
 * изменения у плиток (issue #589, #590).
 *
 * 🔴 Источник тот же, что у списка заказов и у сегмента «Деньги»: поля самих
 * нарядов. Отдельного отчёта со своими правилами подсчёта здесь нет — иначе
 * столбик недели однажды разошёлся бы с таблицей, и объяснить владельцу, какое
 * из чисел настоящее, было бы нечем.
 *
 * 🔴 Сравнение показывается только тогда, когда есть с чем сравнивать. Чип
 * «↑ 9,2 %» у месяца, до которого не было ни одного закрытого наряда, — это
 * рост с нуля, то есть число ни о чём; такой чип не рисуется вовсе, а не
 * подменяется стрелкой вверх.
 */
import type {
  CrmEventKind as DbEventKind,
  OrderStatus as DbOrderStatus,
  OrderType as DbOrderType,
  Prisma,
} from '@prisma/client';

import type { CrmEventKind } from '@/entities/crm/model';
import type { OrderStatus, OrderType } from '@/entities/order/model';
import {
  dayKeyOf,
  momentOf,
  monthKeyOf,
  monthOfDay,
  shiftDay,
  shiftMonth,
  todayKey,
  weekStartOf,
  type DayKey,
  type MonthKey,
} from '@/shared/lib/calendar';
import { pageWindow, type Page } from '@/shared/lib/paging';

import { db } from '../db';

/** Сколько недель показывает столбчатый график. Из макета «Обзор». */
export const CHART_WEEKS = 12;

/** Сколько месяцев показывают линии выручки и выплат. Из макета «Обзор». */
export const CHART_MONTHS = 8;

/** Окно, за которое считается поток новых нарядов, в сутках. */
const FLOW_DAYS = 7;

/** Деление графика: подпись и число. */
export type ChartPoint = {
  readonly label: string;
  readonly value: number;
};

export type SummaryCharts = {
  /** Выполненные наряды по неделям — столбцы «Заказы по неделям». */
  readonly weeks: readonly ChartPoint[];
  /** Выручка по месяцам — первая линия «Выручка и выплаты». */
  readonly revenue: readonly ChartPoint[];
  /** К выплате бригадам по месяцам — вторая линия того же графика. */
  readonly payout: readonly ChartPoint[];
};

export type SummaryTrends = {
  /** Наряды, заведённые за последние семь суток. */
  readonly ordersFlow: number;
  /** Столько же за предыдущие семь суток — с чем сравнивать поток. */
  readonly ordersFlowBefore: number;
  /**
   * Выручка прошлого месяца на то же число дней, что прошло в текущем. Сравнивать
   * пять дней августа с целым июлем — значит показывать спад каждое первое число.
   */
  readonly revenueBefore: number;
};

export type OverviewStats = {
  readonly charts: SummaryCharts;
  readonly trends: SummaryTrends;
  /**
   * Сколько выездов назначено на сегодня — число из строки дня в шапке.
   *
   * Считаются наряды: выезд — это работа с адресом и исполнителем. Дело
   * календаря сюда не идёт, звонок клиенту выездом не является.
   */
  readonly tripsToday: number;
};

/** Строка наряда, из которой считаются оба графика и сравнение выручки. */
type DoneRow = {
  readonly at: Date;
  readonly price: number;
  readonly installerFee: number;
  readonly deductionSum: number;
};

/**
 * Номер недели по ISO 8601 — подпись деления столбчатого графика.
 *
 * Считается по календарному дню в поясе работ, а не по моменту в UTC: наряд,
 * закрытый в час ночи понедельника по Москве, принадлежит этой неделе, а не
 * прошлой (ADR-080).
 */
export function isoWeekNumber(day: DayKey): number {
  const [year = 0, month = 1, date = 1] = day.split('-').map((part) => Number.parseInt(part, 10));

  /* Четверг своей недели однозначно задаёт год, которому неделя принадлежит:
     на стыке лет неделя достаётся тому году, где лежит её четверг. */
  const thursday = new Date(Date.UTC(year, month - 1, date));
  const weekday = (thursday.getUTCDay() + 6) % 7;
  thursday.setUTCDate(thursday.getUTCDate() - weekday + 3);

  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstWeekday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstWeekday + 3);

  const week = (thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000);
  return 1 + Math.round(week);
}

/** Короткое имя месяца: «янв», «фев». Точку `Intl` ставит, макет — нет. */
export function monthLabel(month: MonthKey): string {
  const at = momentOf(`${month}-01`, '12:00');
  const name = new Intl.DateTimeFormat('ru-RU', {
    month: 'short',
    timeZone: 'Europe/Moscow',
  }).format(at);

  return name.replace('.', '');
}

/** Понедельники последних `count` недель, от давнего к текущему. */
function lastWeekStarts(today: DayKey, count: number): readonly DayKey[] {
  const current = weekStartOf(today);
  return Array.from({ length: count }, (_, index) => shiftDay(current, -(count - 1 - index) * 7));
}

/** Ключи последних `count` месяцев, от давнего к текущему. */
function lastMonths(current: MonthKey, count: number): readonly MonthKey[] {
  return Array.from({ length: count }, (_, index) => shiftMonth(current, -(count - 1 - index)));
}

/** Сколько прибавилось к ключу карты. Пустой ключ считается нулём. */
function add(into: Map<string, number>, key: string, value: number): void {
  into.set(key, (into.get(key) ?? 0) + value);
}

/**
 * Числа «Обзора» одним снимком базы.
 *
 * 🔴 Один запрос на оба графика и на сравнение выручки, а не три. Столбцы
 * недель, линии месяцев и выручка прошлого месяца считаются по одному и тому
 * же набору строк — выполненным нарядам за окно графиков, — и три отдельных
 * запроса дали бы три снимка, между которыми успевает пройти чужая правка.
 *
 * Поток нарядов считается отдельно и счётчиками: он смотрит на другое поле
 * (`createdAt`, а не `at`) и на другое окно, и вытягивать ради двух чисел
 * полный список заведённых нарядов незачем.
 */
export async function overviewStats(now: Date = new Date()): Promise<OverviewStats> {
  const today = todayKey(now);
  const month = monthKeyOf(now);

  const weekStarts = lastWeekStarts(today, CHART_WEEKS);
  const months = lastMonths(month, CHART_MONTHS);

  /* Окно берётся по самой ранней из двух границ: у недель и месяцев она
     разная, а запрос один. */
  const earliestWeek = weekStarts[0] ?? today;
  const earliestMonth = months[0] ?? month;
  const from = momentOf(
    earliestWeek < `${earliestMonth}-01` ? earliestWeek : `${earliestMonth}-01`,
    '00:00',
  );

  const flowFrom = momentOf(shiftDay(today, -FLOW_DAYS), '00:00');
  const flowBeforeFrom = momentOf(shiftDay(today, -FLOW_DAYS * 2), '00:00');

  const [rows, ordersFlow, ordersFlowBefore, trips] = await Promise.all([
    db.order.findMany({
      where: { status: 'DONE', at: { gte: from } },
      select: { at: true, price: true, installerFee: true, deductionSum: true },
    }),
    db.order.count({ where: { createdAt: { gte: flowFrom } } }),
    db.order.count({ where: { createdAt: { gte: flowBeforeFrom, lt: flowFrom } } }),
    countTripsToday(now),
  ]);

  return {
    charts: chartsOf(rows, weekStarts, months),
    trends: {
      ordersFlow,
      ordersFlowBefore,
      revenueBefore: revenueBeforeOf(rows, today),
    },
    tripsToday: trips,
  };
}

/**
 * Сколько выездов назначено на сегодня — число из строки дня в шапке
 * (issue #588).
 *
 * 🔴 Отдельной функцией, а не полем большой сводки: шапка одна на все три
 * сегмента, а числа графиков нужны только «Обзору». Читать ради одной цифры
 * восемь месяцев закрытых нарядов — это три лишних запроса в базу на каждый
 * заход в «Деньги» и в «Работу».
 *
 * Считаются наряды: выезд — это работа с адресом и исполнителем. Дело
 * календаря сюда не идёт, звонок клиенту выездом не является.
 */
export async function countTripsToday(now: Date = new Date()): Promise<number> {
  const today = todayKey(now);

  return db.order.count({
    where: {
      status: { in: [...OPEN_STATUSES] },
      at: { gte: momentOf(today, '00:00'), lt: momentOf(shiftDay(today, 1), '00:00') },
    },
  });
}

/**
 * Раскладка строк по делениям обоих графиков.
 *
 * Вынесена чистой функцией: ошибка здесь показывает выручку, которой не было,
 * — а такое проверяется тестом, а не взглядом на картинку.
 */
export function chartsOf(
  rows: readonly DoneRow[],
  weekStarts: readonly DayKey[],
  months: readonly MonthKey[],
): SummaryCharts {
  const byWeek = new Map<string, number>();
  const revenueByMonth = new Map<string, number>();
  const payoutByMonth = new Map<string, number>();

  for (const row of rows) {
    const day = dayKeyOf(row.at);

    add(byWeek, weekStartOf(day), 1);
    add(revenueByMonth, monthOfDay(day), row.price);
    /* Удержание не может увести выплату в минус: отрицательная «выплата»
       на графике читалась бы как долг монтажника компании. */
    add(payoutByMonth, monthOfDay(day), Math.max(row.installerFee - row.deductionSum, 0));
  }

  return {
    weeks: weekStarts.map((start) => ({
      label: String(isoWeekNumber(start)),
      value: byWeek.get(start) ?? 0,
    })),
    revenue: months.map((key) => ({
      label: monthLabel(key),
      value: revenueByMonth.get(key) ?? 0,
    })),
    payout: months.map((key) => ({
      label: monthLabel(key),
      value: payoutByMonth.get(key) ?? 0,
    })),
  };
}

/**
 * Выручка прошлого месяца на то же число дней, что прошло в текущем.
 *
 * 🔴 Именно «на то же число», а не месяц целиком. Полный прошлый месяц против
 * пяти дней текущего показывает обвал каждое первое число — и владелец либо
 * пугается, либо перестаёт смотреть на чип вовсе.
 */
export function revenueBeforeOf(rows: readonly DoneRow[], today: DayKey): number {
  const previous = shiftMonth(monthOfDay(today), -1);
  const elapsed = Number.parseInt(today.slice(8), 10);

  let sum = 0;
  for (const row of rows) {
    const day = dayKeyOf(row.at);
    if (monthOfDay(day) !== previous) continue;
    if (Number.parseInt(day.slice(8), 10) > elapsed) continue;
    sum += row.price;
  }

  return sum;
}

// ---------- Ближайшие дела ----------

/**
 * Что показывать в «Ближайших делах». Значения английские и живут в адресе
 * (инвариант 17): `?show=overdue` — ссылка, которую владелец кладёт в закладки.
 */
export type UpcomingShow = 'all' | 'orders' | 'events' | 'overdue' | 'unassigned';

/** Порядок строк: ближайшие по времени или крупные по деньгам. */
export type UpcomingSort = 'time' | 'sum';

/**
 * Строка «Ближайших дел» в том виде, в каком её отдаёт база.
 *
 * 🔴 Ключи, а не подписи: `install`, а не «Монтаж». Словари видов работ живут в
 * своих разделах (`features/order-manager`, `features/crm-calendar`), и
 * репозиторий, знающий русские названия, стал бы вторым таким словарём — он
 * разошёлся бы с первым на первой же правке.
 */
export type UpcomingRow = {
  readonly id: string;
  readonly nature: 'order' | 'event';
  /** ISO в UTC; в московское время переводит `shared/lib/calendar` при показе. */
  readonly at: string;
  readonly durationMin: number;
  /** Номер наряда. У дела номера нет — оно живёт днём календаря, а не карточкой. */
  readonly number: number | null;
  /** Тип наряда либо вид дела — ровно один из двух, по природе строки. */
  readonly orderType: OrderType | null;
  readonly eventKind: CrmEventKind | null;
  readonly status: OrderStatus | null;
  readonly clientName: string;
  readonly clientPhone: string | null;
  readonly address: string | null;
  readonly installer: InstallerRef | null;
  /** Сумма наряда. У дела денег нет вовсе — это напоминание, а не работа. */
  readonly price: number | null;
};

export type InstallerRef = {
  readonly id: string;
  readonly name: string | null;
  readonly login: string;
};

export type UpcomingQuery = {
  /** С какого момента смотрим: неделя назад, чтобы забытое не исчезало. */
  readonly from: Date;
  /** «Сейчас» приходит снаружи: просрочка не должна зависеть от часов внутри. */
  readonly now: Date;
  readonly show: UpcomingShow;
  readonly sort: UpcomingSort;
  /** Поиск по клиенту и адресу. Пустая строка — искать нечего. */
  readonly query: string;
  readonly page: number;
  readonly size: number;
};

/** Наряды, которые ещё предстоит сделать: закрытые и отменённые сюда не идут. */
const OPEN_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS'] as const;

const ORDER_TYPE_FROM_DB: Record<DbOrderType, OrderType> = {
  INSTALL: 'install',
  SERVICE: 'service',
  REPAIR: 'repair',
};

const ORDER_STATUS_FROM_DB: Record<DbOrderStatus, OrderStatus> = {
  NEW: 'new',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

const EVENT_KIND_FROM_DB: Record<DbEventKind, CrmEventKind> = {
  CALL: 'call',
  MEASURE: 'measure',
  INSTALL: 'install',
  SERVICE: 'service',
  MEETING: 'meeting',
  NOTE: 'note',
};

/** Условие по нарядам. `null` — эта стопка отфильтрована целиком. */
function orderWhere(params: UpcomingQuery): Prisma.OrderWhereInput | null {
  if (params.show === 'events') return null;

  const search: Prisma.OrderWhereInput[] =
    params.query === ''
      ? []
      : [
          {
            OR: [
              { client: { name: { contains: params.query, mode: 'insensitive' } } },
              { address: { contains: params.query, mode: 'insensitive' } },
            ],
          },
        ];

  return {
    status: { in: [...OPEN_STATUSES] },
    at: params.show === 'overdue' ? { gte: params.from, lt: params.now } : { gte: params.from },
    ...(params.show === 'unassigned' ? { installerId: null } : {}),
    ...(search.length > 0 ? { AND: search } : {}),
  };
}

/**
 * Условие по делам календаря.
 *
 * 🔴 `unassigned` отсекает дела целиком, а не показывает их «без исполнителя»:
 * у дела исполнителя не бывает по построению (ADR-093), и строка «не назначен»
 * в этом фильтре обещала бы, что кого-то можно назначить.
 */
function eventWhere(params: UpcomingQuery): Prisma.CrmEventWhereInput | null {
  if (params.show === 'orders' || params.show === 'unassigned') return null;

  const search: Prisma.CrmEventWhereInput[] =
    params.query === ''
      ? []
      : [
          {
            OR: [
              { clientName: { contains: params.query, mode: 'insensitive' } },
              { address: { contains: params.query, mode: 'insensitive' } },
            ],
          },
        ];

  return {
    status: 'PLANNED',
    at: params.show === 'overdue' ? { gte: params.from, lt: params.now } : { gte: params.from },
    ...(search.length > 0 ? { AND: search } : {}),
  };
}

/**
 * Ближайшие наряды и дела одной страницей (issue #591).
 *
 * 🔴 Слияние двух источников в памяти, а не запрос через `UNION`. Наряд и дело
 * — разные сущности с разными полями (ADR-093), и общая выборка потребовала бы
 * представления в базе, которое пришлось бы менять при каждой правке любой из
 * двух таблиц.
 *
 * 🔴 Число берётся `count`, а не длиной слитого списка: иначе разбивка на
 * страницы обещала бы ровно столько строк, сколько успели прочитать. Из каждого
 * источника читается `page × size` строк в его собственном порядке — этого
 * ровно достаточно, чтобы срез слитой ленты был точным.
 */
export async function upcomingWork(params: UpcomingQuery): Promise<Page<UpcomingRow>> {
  const orders = orderWhere(params);
  const events = eventWhere(params);
  const take = Math.max(params.page, 1) * params.size;

  const [orderTotal, eventTotal, orderRows, eventRows] = await Promise.all([
    orders === null ? 0 : db.order.count({ where: orders }),
    events === null ? 0 : db.crmEvent.count({ where: events }),
    orders === null
      ? []
      : db.order.findMany({
          where: orders,
          /* По сумме — только наряды: у дела денег нет, и оно уходит в хвост
             ленты своим порядком по времени. */
          orderBy: params.sort === 'sum' ? { price: 'desc' } : { at: 'asc' },
          take,
          select: {
            id: true,
            number: true,
            type: true,
            status: true,
            at: true,
            durationMin: true,
            address: true,
            price: true,
            client: { select: { name: true, phone: true } },
            installer: { select: { id: true, name: true, login: true } },
          },
        }),
    events === null
      ? []
      : db.crmEvent.findMany({
          where: events,
          orderBy: { at: 'asc' },
          take,
          select: {
            id: true,
            kind: true,
            at: true,
            durationMin: true,
            clientName: true,
            clientPhone: true,
            address: true,
          },
        }),
  ]);

  const rows: UpcomingRow[] = [
    ...orderRows.map((row) => ({
      id: row.id,
      nature: 'order' as const,
      at: row.at.toISOString(),
      durationMin: row.durationMin,
      number: row.number,
      orderType: ORDER_TYPE_FROM_DB[row.type],
      eventKind: null,
      status: ORDER_STATUS_FROM_DB[row.status],
      clientName: row.client.name,
      clientPhone: row.client.phone,
      address: row.address,
      installer: row.installer,
      price: row.price,
    })),
    ...eventRows.map((row) => ({
      id: row.id,
      nature: 'event' as const,
      at: row.at.toISOString(),
      durationMin: row.durationMin,
      number: null,
      orderType: null,
      eventKind: EVENT_KIND_FROM_DB[row.kind],
      status: null,
      clientName: row.clientName,
      clientPhone: row.clientPhone,
      address: row.address,
      installer: null,
      price: null,
    })),
  ].sort(comparatorOf(params.sort));

  const total = orderTotal + eventTotal;
  const window = pageWindow(total, params.page, params.size);

  return {
    items: rows.slice(window.skip, window.skip + window.take),
    total,
    page: window.page,
    pages: window.pages,
  };
}

/**
 * Порядок слитой ленты.
 *
 * Без суммы строка не «нулевая», а «неприменимая»: дело в сортировке по деньгам
 * уходит в конец, а не встаёт рядом с нарядом за ноль рублей.
 */
export function comparatorOf(sort: UpcomingSort): (a: UpcomingRow, b: UpcomingRow) => number {
  if (sort === 'sum') {
    return (left, right) => {
      if (left.price === null && right.price === null) return left.at.localeCompare(right.at);
      if (left.price === null) return 1;
      if (right.price === null) return -1;
      if (left.price !== right.price) return right.price - left.price;
      return left.at.localeCompare(right.at);
    };
  }

  return (left, right) => left.at.localeCompare(right.at);
}
