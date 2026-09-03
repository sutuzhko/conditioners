import Link from 'next/link';

import { STOCK_PATH, stockManagerContent as texts } from '@/features/stock-manager';
import { Skeleton } from '@/shared/ui';

import styles from '../page.module.css';

/** Зоны хранения: ссылка назад и шапка настоящие, карточка списка — заготовкой (issue #334). */
export default function StockZonesLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <Link className={styles.back} href={{ pathname: STOCK_PATH }}>
        {texts.zonesBack}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.zonesTitle}</h1>
        <p className={styles.lead}>{texts.zonesLead}</p>
      </header>

      <Skeleton variant="block" className={styles.zonesSkeleton} />
    </div>
  );
}
