import { KIND_LOOK, monthTitle } from '@/features/crm-calendar';
import { ORDER_TYPE_TITLE, installerName, type OrderCard } from '@/features/order-manager';
import { requireOwnerPage } from '@/server/guards';
import { countActiveInstallers } from '@/server/repo/admin-users';
import { listUpcoming } from '@/server/repo/crm';
import { countByStatus as countLeads } from '@/server/repo/leads';
import { monthMoney } from '@/server/repo/order-stats';
import { countActive as countActiveOrders, list as listOrders } from '@/server/repo/orders';
import { countPending } from '@/server/repo/reviews';
import { readiness } from '@/server/repo/settings';
import { PANEL_TABS, resolvePanelTab } from '@/shared/config/admin-tabs';
import { dayKeyOf, dayRange, monthKeyOf, timeOf, todayKey } from '@/shared/lib/calendar';
import { formatDate } from '@/shared/lib/format';
import {
  AdminSummary,
  adminSummaryContent as texts,
  type AttentionItem,
  type SummaryData,
  type UpcomingItem,
} from '@/widgets/admin-shell';

/* Сводка показывает текущие числа — кешировать её нечего. */
export const dynamic = 'force-dynamic';

/** Сколько строк показывать: экран сводки, а не второй календарь. */
const UPCOMING = 6;

/** Сколько нарядов показывать в «Требуют внимания»: список, а не второй раздел. */
const ATTENTION = 5;

type PageProps = {
  /** Сегмент сводки живёт в адресе (issue #339, #344). */
  readonly searchParams: Promise<{ tab?: string }>;
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
     владельцу — монтажника `sectionAllows` разворачивает на его календарь. */
  const session = await requireOwnerPage();

  const { tab } = await searchParams;
  const segment = resolvePanelTab(PANEL_TABS.overview, tab);

  const now = new Date();
  const month = monthKeyOf(now);
  const viewer = { role: session.role, userId: session.userId };

  if (segment === 'money') {
    const money = await monthMoney(month);

    return (
      <AdminSummary
        period={monthTitle(month)}
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
    const [done, active, fresh, installers, activeCount] = await Promise.all([
      listOrders({ tab: 'history', period: 'month' }, viewer),
      listOrders({ tab: 'active' }, viewer),
      listOrders({ tab: 'new' }, viewer),
      countActiveInstallers(),
      countActiveOrders(),
    ]);

    return (
      <AdminSummary
        period={monthTitle(month)}
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

  /* Отсчёт от начала недели, а не от «сейчас»: дело, до которого не дошли
     руки во вторник, обязано мозолить глаза в четверг, а не исчезнуть. */
  const from = new Date(dayRange(today).from.getTime() - 7 * 86_400_000);

  /* Наряды берутся двумя стопками: «новые» — заведённые и ещё никому не
     отданные, «активные» — назначенные и те, где монтажник уже на объекте.
     Обе приходят по возрастанию времени, поэтому шести самых ранних из их
     объединения достаточно — более поздние заведомо ниже. */
  const [report, newLeads, activeOrders, pendingReviews, money, fresh, active, events] =
    await Promise.all([
      readiness(),
      countLeads('new'),
      countActiveOrders(),
      countPending(),
      monthMoney(month),
      listOrders({ tab: 'new' }, viewer),
      listOrders({ tab: 'active' }, viewer),
      listUpcoming(from, UPCOMING),
    ]);

  // полтора суток, а не ровно сутки: полдень следующего дня попадает в него
  // при любом переводе часов
  const tomorrow = dayKeyOf(new Date(dayRange(today).from.getTime() + 86_400_000 * 1.5));

  /** Когда — словами по Москве: время без дня в списке читается как опечатка. */
  const whenOf = (iso: string): string => {
    const at = new Date(iso);
    const day = dayKeyOf(at);
    const time = timeOf(at);

    if (day === today) return texts.upcomingToday(time);
    if (day === tomorrow) return texts.upcomingTomorrow(time);
    return texts.upcomingOn(formatDate(`${day}T00:00:00.000Z`), time);
  };

  /* Момент несётся рядом со строкой: сортировать «сегодня 18:00» и
     «14 июля, 09:00» как текст — это сортировать по алфавиту, а не по
     времени. Наружу он не уходит: сводка про часовой пояс ничего не знает. */
  type Row = { readonly at: number; readonly item: UpcomingItem };

  const orderRows: readonly Row[] = [...fresh.items, ...active.items].map((order) => ({
    at: Date.parse(order.at),
    item: {
      id: order.id,
      nature: 'order',
      when: whenOf(order.at),
      kind: ORDER_TYPE_TITLE[order.type],
      clientName: order.client.name,
      href: `/admin/orders/${order.id}`,
      overdue: Date.parse(order.at) < now.getTime(),
    },
  }));

  const eventRows: readonly Row[] = events.map((event) => ({
    at: Date.parse(event.at),
    item: {
      id: event.id,
      nature: 'event',
      when: whenOf(event.at),
      kind: KIND_LOOK[event.kind].title,
      clientName: event.clientName,
      /* Дело своей страницы не имеет: оно живёт в дне календаря. */
      href: '/admin/crm',
      overdue: Date.parse(event.at) < now.getTime(),
    },
  }));

  const upcoming: readonly UpcomingItem[] = [...orderRows, ...eventRows]
    .sort((left, right) => left.at - right.at)
    .slice(0, UPCOMING)
    .map((row) => row.item);

  const data: SummaryData = {
    segment: 'overview',
    counts: {
      newLeads,
      activeOrders,
      revenue: money.revenue,
      pendingReviews,
    },
    readiness: {
      ready: report.ready,
      unfinished: report.groups.filter((group) => !group.ready).map((group) => group.key),
    },
    upcoming,
  };

  return <AdminSummary period={monthTitle(month)} data={data} />;
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
