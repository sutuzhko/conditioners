import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Карточка наряда: шапка, лента вкладок и полотно открытой вкладки. */
export default function OrderLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={1} height="44px" />
      <RowsSkeleton rows={1} height="620px" />
    </div>
  );
}
