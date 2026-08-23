import { KIND_LOOK } from '@/features/crm-calendar';
import { listAll as listArticles } from '@/server/repo/articles';
import { listUpcoming } from '@/server/repo/crm';
import { listByStatus as listLeads } from '@/server/repo/leads';
import { listAll as listProducts } from '@/server/repo/products';
import { countPending } from '@/server/repo/reviews';
import { readiness } from '@/server/repo/settings';
import { dayKeyOf, dayRange, timeOf, todayKey } from '@/shared/lib/calendar';
import { formatDate } from '@/shared/lib/format';
import {
  AdminSummary,
  adminSummaryContent as texts,
  type UpcomingEvent,
} from '@/widgets/admin-shell';

/* Сводка показывает текущие числа — кешировать её нечего. */
export const dynamic = 'force-dynamic';

/** Сколько дел показывать: экран сводки, а не второй календарь. */
const UPCOMING = 5;

/**
 * Вход в панель: что требует внимания прямо сейчас.
 *
 * Данные читаются напрямую через `repo`, а не своим же HTTP-запросом к
 * `/api/admin/*`: страница и так серверная, а лишний круг через сеть — это
 * лишний способ отказать.
 */
export default async function AdminHomePage() {
  const now = new Date();
  const today = todayKey(now);

  /* Отсчёт от начала недели, а не от «сейчас»: дело, до которого не дошли
     руки во вторник, обязано мозолить глаза в четверг, а не исчезнуть. */
  const from = new Date(dayRange(today).from.getTime() - 7 * 86_400_000);

  const [report, newLeads, pendingReviews, products, articles, events] = await Promise.all([
    readiness(),
    listLeads('new'),
    countPending(),
    listProducts(),
    listArticles(),
    listUpcoming(from, UPCOMING),
  ]);

  // полтора суток, а не ровно сутки: полдень следующего дня попадает в него
  // при любом переводе часов
  const tomorrow = dayKeyOf(new Date(dayRange(today).from.getTime() + 86_400_000 * 1.5));

  const upcoming: UpcomingEvent[] = events.map((event) => {
    const at = new Date(event.at);
    const day = dayKeyOf(at);
    const time = timeOf(at);

    const when =
      day === today
        ? texts.upcomingToday(time)
        : day === tomorrow
          ? texts.upcomingTomorrow(time)
          : texts.upcomingOn(formatDate(`${day}T00:00:00.000Z`), time);

    return {
      id: event.id,
      when,
      kind: KIND_LOOK[event.kind].title,
      clientName: event.clientName,
      overdue: at.getTime() < now.getTime(),
    };
  });

  return (
    <AdminSummary
      counts={{
        newLeads: newLeads.length,
        pendingReviews,
        models: products.length,
        articles: articles.length,
      }}
      readiness={{
        ready: report.ready,
        unfinished: report.groups.filter((group) => !group.ready).map((group) => group.key),
      }}
      upcoming={upcoming}
    />
  );
}
