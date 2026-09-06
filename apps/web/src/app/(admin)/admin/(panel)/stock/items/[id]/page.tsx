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
import { DataBlock, FieldsSkeleton, RowsSkeleton, blockErrorNote } from '@/widgets/admin-shell';

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
 *
 * 🔴 Существование позиции решается **до** первого куска потока (issue #651).
 * Пока заготовка стояла на границе раздела, она уходила в ответ первой, и
 * `notFound()` заставал статус уже отправленным: удалённая позиция отвечала
 * 200. Здесь до первого байта успевает пройти только чтение самой позиции —
 * по ней же собирается шапка, — а справочник моделей и журнал движений
 * приезжают следом.
 */
export default async function AdminStockItemPage({ params, searchParams }: PageProps) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  const session = await requireOwnerPage();
  const viewer = { role: session.role, userId: session.userId };

  const { id } = await params;
  const { page } = await searchParams;

  const found = await findItem(id, viewer);
  if (found === null) notFound();

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

      <DataBlock
        surface="bare"
        skeleton={
          <>
            <FieldsSkeleton fields={6} />
            <RowsSkeleton rows={1} height="320px" />
          </>
        }
        title={texts.itemLoadFailed}
        note={blockErrorNote(STOCK_PATH)}
      >
        <ItemBody itemId={found.item.id} draft={itemDraftOf(found.item)} page={page} />
      </DataBlock>
    </div>
  );
}

/**
 * Форма позиции и её журнал — то, что приезжает отдельным куском потока.
 *
 * Справочник моделей нужен только форме, а журнал — только истории движений:
 * ни то, ни другое не отвечает на вопрос «а есть ли такая позиция», и держать
 * ради них код ответа не за что.
 */
async function ItemBody({
  itemId,
  draft,
  page,
}: {
  readonly itemId: string;
  readonly draft: ReturnType<typeof itemDraftOf>;
  readonly page: string | undefined;
}) {
  const [catalog, journal] = await Promise.all([
    listAll(),
    movements({ item: itemId, page: pageNumber(page) }),
  ]);

  const products: readonly StockItemProduct[] = catalog.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
  }));

  return (
    <>
      <StockItemForm
        itemId={itemId}
        initial={draft}
        products={products}
        title={texts.itemCardTitle}
        hint={texts.itemCardHint}
        archivable
      />

      <StockJournal journal={journal} basePath={stockItemPath(itemId)} />
    </>
  );
}
