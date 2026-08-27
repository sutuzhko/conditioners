import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  StockJournal,
  StockItemForm,
  STOCK_MOVE_PATH,
  STOCK_PATH,
  itemDraftOf,
  pageNumber,
  stockItemPath,
  stockManagerContent as texts,
  stockMoveQuery,
  type StockItemProduct,
} from '@/features/stock-manager';
import { requireOwnerPage } from '@/server/guards';
import { listAll } from '@/server/repo/products';
import { item as findItem, movements } from '@/server/repo/stock';
import { buttonClassName } from '@/shared/ui';

import styles from '../../page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const session = await requireOwnerPage();
  const { id } = await params;
  const found = await findItem(id, { role: session.role, userId: session.userId });

  return { title: found === null ? texts.title : found.item.name };
}

/**
 * Карточка позиции: справочные данные, её журнал и вход в движение.
 *
 * 🔴 Остаток здесь не правится ни одним полем: он сумма движений. Правка руками
 * существует, но как инвентаризация с обязательным основанием (ADR-134).
 *
 * Правка — страницей, а не окном (ADR-117): ссылку на карточку можно прислать,
 * F5 не выбрасывает в список, и рядом с формой живёт журнал движений, ради
 * которого сюда и заходят. А вот движение заводится окном (ADR-137) — форма
 * его больше не занимает половину карточки.
 */
export default async function AdminStockItemPage({ params, searchParams }: PageProps) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  const session = await requireOwnerPage();
  const viewer = { role: session.role, userId: session.userId };

  const { id } = await params;
  const { page } = await searchParams;

  const [found, journal, catalog] = await Promise.all([
    findItem(id, viewer),
    movements({ item: id, page: pageNumber(page) }),
    listAll(),
  ]);

  if (found === null) notFound();

  const products: readonly StockItemProduct[] = catalog.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
  }));

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: STOCK_PATH }}>
        {texts.back}
      </Link>

      <header className={styles.header}>
        <div className={styles.headline}>
          <h1 className={styles.title}>{found.item.name}</h1>

          <Link
            className={buttonClassName({ size: 'sm' })}
            href={{
              pathname: STOCK_MOVE_PATH,
              query: stockMoveQuery({ item: found.item.id }),
            }}
          >
            {texts.moveOpen}
          </Link>
        </div>

        <p className={styles.meta}>
          <span>{found.item.group ?? texts.itemGroupNone}</span>
          <span>{texts.qty(found.item.total, found.item.unit)}</span>
          {found.item.archived ? (
            <span className={styles.archived}>{texts.itemArchived}</span>
          ) : null}
        </p>
      </header>

      <StockItemForm
        itemId={found.item.id}
        initial={itemDraftOf(found.item)}
        products={products}
        title={texts.itemCardTitle}
        hint={texts.itemCardHint}
        archivable
      />

      <StockJournal journal={journal} basePath={stockItemPath(found.item.id)} />
    </div>
  );
}
