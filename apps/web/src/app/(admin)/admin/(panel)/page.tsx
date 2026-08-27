import { KIND_LOOK } from '@/features/crm-calendar';
import { ORDER_TYPE_TITLE } from '@/features/order-manager';
import { requireOwnerPage } from '@/server/guards';
import { countActiveInstallers } from '@/server/repo/admin-users';
import { countAll as countClients } from '@/server/repo/clients';
import { listUpcoming } from '@/server/repo/crm';
import { countByStatus as countLeads } from '@/server/repo/leads';
import { countActive as countActiveOrders, list as listOrders } from '@/server/repo/orders';
import { countPending } from '@/server/repo/reviews';
import { readiness } from '@/server/repo/settings';
import { dayKeyOf, dayRange, timeOf, todayKey } from '@/shared/lib/calendar';
import { formatDate } from '@/shared/lib/format';
import {
  AdminSummary,
  adminSummaryContent as texts,
  type UpcomingItem,
} from '@/widgets/admin-shell';

/* Сводка показывает текущие числа — кешировать её нечего. */
export const dynamic = 'force-dynamic';

/** Сколько строк показывать: экран сводки, а не второй календарь. */
const UPCOMING = 6;

/**
 * Вход в панель: что требует внимания прямо сейчас (CRM.md §3.8).
 *
 * Данные читаются напрямую через `repo`, а не своим же HTTP-запросом к
 * `/api/admin/*`: страница и так серверная, а лишний круг через сеть — это
 * лишний способ отказать. Счётчики берутся готовыми функциями репозиториев —
 * своего запроса поверх чужой таблицы здесь нет ни одного.
 */
export default async function AdminHomePage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). Сводка адресована
     владельцу — монтажника `sectionAllows` разворачивает на его календарь. */
  const session = await requireOwnerPage();

  const now = new Date();
  const today = todayKey(now);

  /* Отсчёт от начала недели, а не от «сейчас»: дело, до которого не дошли
     руки во вторник, обязано мозолить глаза в четверг, а не исчезнуть. */
  const from = new Date(dayRange(today).from.getTime() - 7 * 86_400_000);

  /* Наряды берутся двумя вкладками: «новые» — заведённые и ещё никому не
     отданные, «активные» — назначенные и те, где монтажник уже на объекте.
     Обе приходят по возрастанию времени, поэтому шести самых ранних из их
     объединения достаточно — более поздние заведомо ниже. */
  const [
    report,
    newLeads,
    activeOrders,
    clients,
    installers,
    pendingReviews,
    fresh,
    active,
    events,
  ] = await Promise.all([
    readiness(),
    countLeads('new'),
    countActiveOrders(),
    countClients(),
    countActiveInstallers(),
    countPending(),
    listOrders({ tab: 'new' }, { role: session.role, userId: session.userId }),
    listOrders({ tab: 'active' }, { role: session.role, userId: session.userId }),
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

  return (
    <AdminSummary
      counts={{ newLeads, activeOrders, clients, installers, pendingReviews }}
      readiness={{
        ready: report.ready,
        unfinished: report.groups.filter((group) => !group.ready).map((group) => group.key),
      }}
      upcoming={upcoming}
    />
  );
}
