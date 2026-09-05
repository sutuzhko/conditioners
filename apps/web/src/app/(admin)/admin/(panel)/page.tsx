import type { Metadata } from 'next';

import { KIND_LOOK, monthTitle } from '@/features/crm-calendar';
import { ORDER_TYPE_TITLE, installerName, type OrderCard } from '@/features/order-manager';
import { ORDER_STATUS_TITLE, ORDER_STATUS_VARIANT } from '@/entities/order/model';
import { requireOwnerPage } from '@/server/guards';
import { countActiveInstallers } from '@/server/repo/admin-users';
import { queueCounts } from '@/server/repo/leads';
import { monthMoney } from '@/server/repo/order-stats';
import { countActive as countActiveOrders, list as listOrders } from '@/server/repo/orders';
import { readiness } from '@/server/repo/settings';
import {
  countTripsToday,
  overviewStats,
  upcomingWork,
  type UpcomingRow,
  type UpcomingShow,
  type UpcomingSort,
} from '@/server/repo/summary';
import { PANEL_TABS, resolvePanelTab } from '@/shared/config/admin-tabs';
import { dayKeyOf, dayRange, monthKeyOf, timeOf, todayKey } from '@/shared/lib/calendar';
import type { BadgeVariant } from '@/shared/ui';
import {
  AdminSummary,
  adminSummaryContent as texts,
  dayPartOf,
  dayShort,
  dayTitle,
  overviewDeltas,
  upcomingFiltersFromParams,
  UPCOMING_PAGE_SIZE,
  type AttentionItem,
  type SummaryData,
  type SummaryHead,
  type UpcomingItem,
} from '@/widgets/admin-shell';

/* Сводка показывает текущие числа — кешировать её нечего. */
export const dynamic = 'force-dynamic';

/* 🔴 Заголовком страницы служит приветствие (макет «Обзор», issue #588), и
   название раздела ушло бы с экрана вовсе. Оно остаётся в заголовке вкладки:
   читалка объявляет его при переходе, а владелец видит в списке вкладок. */
export const metadata: Metadata = { title: texts.title };

/** Сколько нарядов показывать в «Требуют внимания»: список, а не второй раздел. */
const ATTENTION = 5;

/** Час в миллисекундах — возраст самого старого непринятого обращения. */
const HOUR = 60 * 60 * 1000;

type PageProps = {
  /**
   * Сегмент сводки живёт в адресе (issue #339, #344), там же — состояние
   * таблицы «Ближайших дел» (issue #591). Имя `tab` занято сегментом, поэтому
   * у таблицы свои ключи: `show`, `sort`, `cols`, `q`, `page`.
   */
  readonly searchParams: Promise<{
    tab?: string;
    show?: string;
    sort?: string;
    cols?: string;
    q?: string;
    page?: string;
  }>;
};

/**
 * Вход в панель: что требует внимания прямо сейчас (CRM.md §3.8, issue #344).
 *
 * Данные читаются напрямую через `repo`, а не своим же HTTP-запросом к
 * `/api/admin/*`: страница и так серверная, а лишний круг через сеть — это
 * лишний способ отказать.
 *
 * 🔴 Читается ровно то, что показывает открытый сегмент. Сводка из трёх
 * сегментов, собирающая на каждый заход числа всех трёх, — это три запроса в
 * базу ради одного экрана; сегмент разбирается здесь, до чтения данных, и
 * мусор в параметре открывает первый (issue #341).
 */
export default async function AdminHomePage({ searchParams }: PageProps) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). Сводка адресована
     владельцу — монтажнику `requireOwnerPage` отвечает отказом, и до чтения
     нарядов с их суммами дело не доходит вовсе (ADR-114). */
  const session = await requireOwnerPage();

  const params = await searchParams;
  const segment = resolvePanelTab(PANEL_TABS.overview, params.tab);

  const now = new Date();
  const month = monthKeyOf(now);
  const viewer = { role: session.role, userId: session.userId };

  /* Шапка одна на все три сегмента: она про день владельца, а не про то,
     какую точку зрения он сейчас выбрал (макет «Обзор»). */
  const head = (trips: number): SummaryHead => ({
    greeting: texts.greeting(dayPartOf(timeOf(now)), session.name),
    dayLine: texts.dayLine(dayTitle(now), trips),
  });

  if (segment === 'money') {
    /* 🔴 Шапке нужно одно число, а не все числа «Обзора»: восемь месяцев
       закрытых нарядов ради строки «3 выезда сегодня» — это лишний запрос на
       каждый заход в сегмент, который их не показывает. */
    const [money, trips] = await Promise.all([monthMoney(month), countTripsToday(now)]);

    return (
      <AdminSummary
        period={monthTitle(month)}
        head={head(trips)}
        data={{
          segment,
          money: {
            revenue: money.revenue,
            average: money.average,
            payout: money.payout,
            cash: money.cash,
            shares: money.shares.map((share) => ({
              title: ORDER_TYPE_TITLE[share.type],
              sum: share.sum,
              percent: share.percent,
            })),
            weeks: money.weeks.map((week) => ({ label: week.label, sum: week.sum })),
          },
        }}
      />
    );
  }

  if (segment === 'work') {
    /* Стопки читаются страницами по восемь, и это ровно то, что нужно: активные
       приходят по возрастанию времени, то есть просроченные — в начале, а
       новые без исполнителя видны с первой же страницы. */
    const [done, active, fresh, installers, activeCount, trips] = await Promise.all([
      listOrders({ tab: 'history', period: 'month' }, viewer),
      listOrders({ tab: 'active' }, viewer),
      listOrders({ tab: 'new' }, viewer),
      countActiveInstallers(),
      countActiveOrders(),
      countTripsToday(now),
    ]);

    return (
      <AdminSummary
        period={monthTitle(month)}
        head={head(trips)}
        data={{
          segment,
          work: {
            done: done.total,
            active: activeCount,
            fresh: fresh.total,
            installers,
          },
          attention: attentionOf([...active.items, ...fresh.items], now),
        }}
      />
    );
  }

  const today = todayKey(now);
  const filters = upcomingFiltersFromParams(params);

  /* Полтора суток, а не ровно сутки: полдень следующего дня попадает в него
     при любом переводе часов. */
  const tomorrow = dayKeyOf(new Date(dayRange(today).from.getTime() + 86_400_000 * 1.5));

  /* Отсчёт от начала недели, а не от «сейчас»: дело, до которого не дошли
     руки во вторник, обязано мозолить глаза в четверг, а не исчезнуть. */
  const from = new Date(dayRange(today).from.getTime() - 7 * 86_400_000);

  const [report, leads, activeOrders, money, stats, upcoming] = await Promise.all([
    readiness(),
    queueCounts(now),
    countActiveOrders(),
    monthMoney(month),
    overviewStats(now),
    upcomingWork({
      from,
      now,
      show: filters.show satisfies UpcomingShow,
      sort: filters.sort satisfies UpcomingSort,
      query: filters.query,
      page: filters.page,
      size: UPCOMING_PAGE_SIZE,
    }),
  ]);

  const retained = money.revenue - money.payout;

  const data: SummaryData = {
    segment: 'overview',
    counts: {
      newLeads: leads.fresh,
      activeOrders,
      revenue: money.revenue,
      retained,
    },
    deltas: overviewDeltas({
      staleLeadHours:
        leads.oldest === null
          ? null
          : Math.floor((now.getTime() - Date.parse(leads.oldest.createdAt)) / HOUR),
      ordersFlow: stats.trends.ordersFlow,
      ordersFlowBefore: stats.trends.ordersFlowBefore,
      revenue: money.revenue,
      revenueBefore: stats.trends.revenueBefore,
      retained,
    }),
    charts: {
      weeks: {
        labels: stats.charts.weeks.map((point) => point.label),
        values: stats.charts.weeks.map((point) => point.value),
      },
      revenue: {
        labels: stats.charts.revenue.map((point) => point.label),
        values: stats.charts.revenue.map((point) => point.value),
      },
      payout: stats.charts.payout.map((point) => point.value),
    },
    readiness: {
      ready: report.ready,
      unfinished: report.groups.filter((group) => !group.ready).map((group) => group.key),
    },
    upcoming: {
      items: upcoming.items.map((row) => rowOf(row, now, today, tomorrow)),
      filters,
      total: upcoming.total,
      page: upcoming.page,
      pages: upcoming.pages,
    },
  };

  return <AdminSummary period={monthTitle(month)} head={head(stats.tripsToday)} data={data} />;
}

/**
 * Строка таблицы «Ближайших дел» из строки базы.
 *
 * 🔴 Подписи собираются здесь, а не в репозитории и не в сводке: словари видов
 * работ живут в своих разделах (`features/order-manager`, `features/crm-calendar`),
 * и второй такой словарь рядом разошёлся бы с первым на первой же правке.
 */
function rowOf(row: UpcomingRow, now: Date, today: string, tomorrow: string): UpcomingItem {
  const at = new Date(row.at);
  const day = dayKeyOf(at);
  const overdue = at.getTime() < now.getTime();

  const status = statusOf(row, overdue);
  const calendar = { pathname: '/admin/crm', query: { day, view: 'day' } };
  const place = [row.clientName, row.address].filter(
    (part): part is string => part !== null && part !== '',
  );

  return {
    id: row.id,
    nature: row.nature,
    at: row.at,
    day: dayLabelOf(day, today, tomorrow, at),
    clock: `${timeOf(at)} · ${texts.duration(row.durationMin)}`,
    kind: kindOf(row),
    place: place.join(' · '),
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    installerName: row.installer === null ? null : (row.installer.name ?? row.installer.login),
    statusTitle: status.title,
    statusVariant: status.variant,
    sum: row.price === null ? null : texts.money(row.price),
    /* Дело своей страницы не имеет: оно живёт в дне календаря (ADR-093). */
    href: row.nature === 'order' ? { pathname: `/admin/orders/${row.id}` } : calendar,
    dayHref: calendar,
    number: row.number,
    overdue,
  };
}

/**
 * День строки словами. Ближайшие два дня называются словами: «сегодня»
 * понятнее даты, а одинокое число без дня недели в списке из трёх дат читается
 * как опечатка.
 */
function dayLabelOf(day: string, today: string, tomorrow: string, at: Date): string {
  if (day === today) return texts.dayToday;
  if (day === tomorrow) return texts.dayTomorrow;
  return dayShort(at);
}

/** Что за работа: тип наряда либо вид дела. Ровно одно из двух по построению. */
function kindOf(row: UpcomingRow): string {
  if (row.orderType !== null) return ORDER_TYPE_TITLE[row.orderType];
  if (row.eventKind !== null) return KIND_LOOK[row.eventKind].title;
  return texts.natureTitle(row.nature);
}

/**
 * Статус строки. Просрочка перебивает собственный статус наряда: «Назначен» у
 * работы, время которой прошло вчера, — не та новость, за которой в сводку
 * заходят.
 */
function statusOf(
  row: UpcomingRow,
  overdue: boolean,
): { readonly title: string; readonly variant: BadgeVariant } {
  if (overdue) return { title: texts.attentionOverdue, variant: 'danger' };
  if (row.status === null) return { title: texts.eventPlanned, variant: 'neutral' };

  return { title: ORDER_STATUS_TITLE[row.status], variant: ORDER_STATUS_VARIANT[row.status] };
}

/**
 * Что горит: наряд, по которому время вышло, и наряд, на который некому
 * ехать. Оба — вопрос «успеваем ли», и оба видны из стопок, которые сводка и
 * так читает.
 */
function attentionOf(orders: readonly OrderCard[], now: Date): readonly AttentionItem[] {
  const rows = orders
    .map((order) => {
      const overdue = Date.parse(order.at) < now.getTime();
      const reason = order.installer === null ? 'unassigned' : overdue ? 'overdue' : null;
      if (reason === null) return null;

      return {
        id: order.id,
        title: `${ORDER_TYPE_TITLE[order.type]} · ${order.client.name}`,
        note:
          order.installer === null
            ? order.address
            : `${installerName(order.installer)} · ${order.address}`,
        href: `/admin/orders/${order.id}`,
        reason,
      } satisfies AttentionItem;
    })
    .filter((row): row is AttentionItem => row !== null);

  return rows.slice(0, ATTENTION);
}
