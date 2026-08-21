import { listAll as listArticles } from '@/server/repo/articles';
import { listByStatus as listLeads } from '@/server/repo/leads';
import { listAll as listProducts } from '@/server/repo/products';
import { countPending } from '@/server/repo/reviews';
import { readiness } from '@/server/repo/settings';
import { AdminSummary } from '@/widgets/admin-shell';

/* Сводка показывает текущие числа — кешировать её нечего. */
export const dynamic = 'force-dynamic';

/**
 * Вход в панель: что требует внимания прямо сейчас.
 *
 * Данные читаются напрямую через `repo`, а не своим же HTTP-запросом к
 * `/api/admin/*`: страница и так серверная, а лишний круг через сеть — это
 * лишний способ отказать.
 */
export default async function AdminHomePage() {
  const [report, newLeads, pendingReviews, products, articles] = await Promise.all([
    readiness(),
    listLeads('new'),
    countPending(),
    listProducts(),
    listArticles(),
  ]);

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
    />
  );
}
