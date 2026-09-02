import { pricesFormContent as texts } from '@/features/prices-form';
import { FieldsSkeleton } from '@/widgets/admin-shell';

import styles from '../leads/page.module.css';

/** Цены на монтаж: шапка настоящая, поля прайса — заготовками (issue #334). */
export default function PricesLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <FieldsSkeleton fields={6} />
      <FieldsSkeleton fields={4} />
    </div>
  );
}
