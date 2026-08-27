import { FieldsSkeleton, HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Уведомления: готовность каналов, выбор адресатов и журнал доставки. */
export default function NotificationsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={1} height="120px" />
      <FieldsSkeleton fields={4} />
      <RowsSkeleton rows={2} height="140px" />
      <RowsSkeleton rows={3} height="76px" />
    </div>
  );
}
