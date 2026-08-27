import type { Metadata } from 'next';
import Link from 'next/link';

import {
  STOCK_ZONES_PATH,
  StockFilters,
  StockItemAdd,
  StockTable,
  lowFromParam,
  pageNumber,
  stockManagerContent as texts,
  type StockItemProduct,
} from '@/features/stock-manager';
import { requireOwnerPage } from '@/server/guards';
import { listAll } from '@/server/repo/products';
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

  const [found, catalog] = await Promise.all([
    overview(
      {
        query: filters.query,
        group: filters.group,
        low: filters.low,
        archived: filters.archived,
        page: pageNumber(page),
      },
      { role: session.role, userId: session.userId },
    ),
    listAll(),
  ]);

  /* Форме позиции нужны только имя и адрес модели: фотографии, характеристики
     и цены каталога складу не нужны вовсе. */
  const products: readonly StockItemProduct[] = catalog.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
  }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headline}>
          <h1 className={styles.title}>{texts.title}</h1>

          <Link
            className={buttonClassName({ size: 'sm', variant: 'secondary' })}
            href={{ pathname: STOCK_ZONES_PATH }}
          >
            {texts.zonesOpen}
          </Link>
        </div>

        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <StockFilters
        filters={filters}
        groups={found.groups}
        total={found.total}
        lowCount={found.lowCount}
      />

      <StockItemAdd products={products} />

      <StockTable overview={found} filters={filters} />
    </div>
  );
}
