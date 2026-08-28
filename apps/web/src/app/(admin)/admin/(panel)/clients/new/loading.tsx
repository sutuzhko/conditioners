import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Новый клиент: заголовок и поля карточки. */
export default function ClientNewLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      {/* Четыре поля: имя, телефон, адрес и заметка. */}
      <FieldsSkeleton fields={4} />
    </div>
  );
}
