import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from '../leads/page.module.css';

/** Прайс монтажа: таблица классов и ставки допуслуг — обе формой. */
export default function PricesLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={6} />
      <FieldsSkeleton fields={4} />
    </div>
  );
}
