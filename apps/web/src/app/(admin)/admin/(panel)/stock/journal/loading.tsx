import Link from 'next/link';

import { STOCK_PATH, stockManagerContent as texts } from '@/features/stock-manager';
import { Skeleton } from '@/shared/ui';
import { LineSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/**
 * Журнал движений: ссылка назад, шапка и пояснение настоящие, счётчик и
 * таблица — заготовками (issue #334). Число записей приходит с данными,
 * поэтому строка под пояснением — заготовка той же высоты строки.
 */
export default function StockJournalLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <Link className={styles.back} href={{ pathname: STOCK_PATH }}>
        {texts.journalBack}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.journalAllTitle}</h1>
        <p className={styles.lead}>{texts.journalAllLead}</p>
        <p className={styles.meta}>
          <LineSkeleton width="min(220px, 60%)" />
        </p>
      </header>

      <Skeleton variant="block" className={styles.metaSkeleton} />
    </div>
  );
}
