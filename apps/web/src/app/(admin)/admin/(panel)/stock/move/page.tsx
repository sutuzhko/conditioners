import type { Metadata } from 'next';
import Link from 'next/link';

import { StockMoveForm, STOCK_PATH, stockManagerContent as texts } from '@/features/stock-manager';
import { Card } from '@/shared/ui';

import { moveFormData } from '../data';
import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.moveTitle };

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ item?: string; from?: string; to?: string; kind?: string }>;
};

/**
 * Движение страницей: тот же адрес, открытый ссылкой или обновлением.
 *
 * 🔴 Остаток не правится напрямую ни одним полем: он сумма движений. Правка
 * руками существует, но как инвентаризация с обязательным основанием
 * (ADR-134).
 */
export default async function AdminStockMovePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { items, zones, initial } = await moveFormData(params);

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: STOCK_PATH }}>
        {texts.back}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.moveTitle}</h1>
        <p className={styles.lead}>{texts.moveHint}</p>
      </header>

      <Card as="section">
        <StockMoveForm items={items} zones={zones} initial={initial} surface="bare" />
      </Card>
    </div>
  );
}
