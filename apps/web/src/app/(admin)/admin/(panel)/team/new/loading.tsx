import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Новый монтажник: заголовок и поля учётной записи. */
export default function TeamNewLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      {/* Шесть полей: имя, логин, телефон, пароль, ИНН и оформление. */}
      <FieldsSkeleton fields={6} />
    </div>
  );
}
