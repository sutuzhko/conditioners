import { pricesFormContent as texts } from '@/features/prices-form';

import { PricesSkeleton } from './PricesSkeleton';
import styles from './page.module.css';

/** Цены на монтаж: шапка настоящая, поля прайса — заготовками (issue #334). */
export default function PricesLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <PricesSkeleton />
    </div>
  );
}
