import type { Metadata } from 'next';
import Link from 'next/link';

import {
  StockJournal,
  STOCK_JOURNAL_PATH,
  STOCK_PATH,
  pageNumber,
  stockManagerContent as texts,
} from '@/features/stock-manager';
import { isStockMoveKind } from '@/entities/stock/model';
import { requireOwnerPage } from '@/server/guards';
import { movements } from '@/server/repo/stock';

import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.journalAllTitle };

export const dynamic = 'force-dynamic';

/**
 * Журнал движений всего склада.
 *
 * 🔴 Свой экран, а не замена истории позиции (ADR-137): «что вообще
 * происходило на складе на этой неделе» спрашивают чаще, чем «что происходило
 * с этой трубой», и отвечать на это перебором позиций нельзя. История позиции
 * при этом остаётся в её карточке — это другой вопрос.
 *
 * 🔴 Раздел владельца: по журналу видно, кто, что и куда двигал по всей
 * компании (docs/API.md §14). Проверка стоит до чтения данных (ADR-095).
 */
export default async function AdminStockJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string }>;
}) {
  await requireOwnerPage();

  const { page, kind } = await searchParams;
  /* Вид приходит адресом, а адрес правят руками: неизвестное значение — это
     «покажи всё», а не пустой журнал с необъяснимым фильтром. */
  const selected = kind !== undefined && isStockMoveKind(kind) ? kind : undefined;
  const journal = await movements({ page: pageNumber(page), kind: selected });

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: STOCK_PATH }}>
        {texts.journalBack}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.journalAllTitle}</h1>
        <p className={styles.lead}>{texts.journalAllLead}</p>
        <p className={styles.meta}>{texts.journalCount(journal.total)}</p>
      </header>

      <StockJournal
        journal={journal}
        basePath={STOCK_JOURNAL_PATH}
        withItem
        withFilter
        emptyText={texts.journalAllEmpty}
        {...(selected === undefined ? {} : { kind: selected })}
      />
    </div>
  );
}
