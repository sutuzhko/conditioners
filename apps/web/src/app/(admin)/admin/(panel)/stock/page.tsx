import type { Metadata } from 'next';
import Link from 'next/link';

import {
  STOCK_ITEM_NEW_PATH,
  STOCK_JOURNAL_PATH,
  STOCK_ZONES_PATH,
  StockFilters,
  StockTable,
  lowFromParam,
  pageNumber,
  stockManagerContent as texts,
} from '@/features/stock-manager';
import { requireOwnerPage } from '@/server/guards';
import { overview } from '@/server/repo/stock';
import { buttonClassName } from '@/shared/ui';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Остатки материалов по зонам хранения.
 *
 * 🔴 Раздел владельца: остаток гаража — это ещё и закупочные привычки, и
 * открывать их всей команде владелец не обязан (ADR-134). Проверка стоит здесь,
 * до первого обращения к репозиторию (ADR-095), а не только во внешнем layout:
 * страж выше страницы успевает сменить адрес, но не остановить чтение данных.
 *
 * Поиск, группа, вид списка и страница живут в адресе: отфильтрованные
 * остатки — ссылка, которую можно сохранить и прислать себе.
 *
 * 🔴 Заведение позиции ушло в окно (ADR-137): свёрнутая форма над таблицей
 * уводила её вниз ровно тогда, когда на неё смотрят. Список моделей каталога
 * читает уже сама форма — странице остатков он не нужен вовсе.
 *
 * Читаем `repo` напрямую, а не своим же запросом к `/api/admin/stock`: страница
 * и так серверная, лишний круг через сеть — лишний способ отказать.
 */
export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    group?: string;
    low?: string;
    archived?: string;
    page?: string;
  }>;
}) {
  const session = await requireOwnerPage();

  const { q, group, low, archived, page } = await searchParams;
  const filters = {
    query: q?.trim() ?? '',
    group: group?.trim() ?? '',
    low: lowFromParam(low),
    archived: lowFromParam(archived),
  };

  const found = await overview(
    {
      query: filters.query,
      group: filters.group,
      low: filters.low,
      archived: filters.archived,
      page: pageNumber(page),
    },
    { role: session.role, userId: session.userId },
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headline}>
          <h1 className={styles.title}>{texts.title}</h1>

          <div className={styles.actions}>
            <Link
              className={buttonClassName({ size: 'sm' })}
              href={{ pathname: STOCK_ITEM_NEW_PATH }}
            >
              {texts.itemAddOpen}
            </Link>

            <Link
              className={buttonClassName({ size: 'sm', variant: 'secondary' })}
              href={{ pathname: STOCK_JOURNAL_PATH }}
            >
              {texts.journalOpen}
            </Link>

            <Link
              className={buttonClassName({ size: 'sm', variant: 'secondary' })}
              href={{ pathname: STOCK_ZONES_PATH }}
            >
              {texts.zonesOpen}
            </Link>
          </div>
        </div>

        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <StockFilters
        filters={filters}
        groups={found.groups}
        total={found.total}
        lowCount={found.lowCount}
      />

      <StockTable overview={found} filters={filters} />
    </div>
  );
}
