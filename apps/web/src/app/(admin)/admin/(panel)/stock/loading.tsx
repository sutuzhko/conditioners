import Link from 'next/link';

import {
  STOCK_ITEM_NEW_PATH,
  STOCK_JOURNAL_PATH,
  STOCK_ZONES_PATH,
  stockManagerContent as texts,
} from '@/features/stock-manager';
import { Skeleton, buttonClassName } from '@/shared/ui';

import styles from './page.module.css';

/**
 * Остатки склада: шапка настоящая, фильтры и таблица — заготовками по замеру
 * готовой страницы (issue #334). Шапка с тремя действиями на 390 занимает
 * четыре строки — ни одна полоса этого не повторит.
 */
export default function StockLoading() {
  return (
    <div className={styles.page} aria-busy="true">
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
              className={buttonClassName({ size: 'sm', variant: 'bordered' })}
              href={{ pathname: STOCK_JOURNAL_PATH }}
            >
              {texts.journalOpen}
            </Link>

            <Link
              className={buttonClassName({ size: 'sm', variant: 'bordered' })}
              href={{ pathname: STOCK_ZONES_PATH }}
            >
              {texts.zonesOpen}
            </Link>
          </div>
        </div>

        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <Skeleton variant="block" className={styles.filtersSkeleton} />
      <Skeleton variant="block" className={styles.tableSkeleton} />
    </div>
  );
}
