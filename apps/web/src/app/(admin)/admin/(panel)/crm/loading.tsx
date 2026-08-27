import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/**
 * Календарь на загрузке: шапка и сетка часов во всю ширину.
 *
 * Скелетон повторяет то, что придёт: шапку с листанием, полосу «весь день» и
 * колонки часов. Прежний скелетон рисовал сетку месяца и колонку дня справа —
 * ни того, ни другого на экране больше нет (ADR-128).
 */
export default function CrmLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />

      <div className={styles.calendar}>
        <RowsSkeleton rows={1} height="44px" />
        <RowsSkeleton rows={1} height="72px" />
        <RowsSkeleton rows={1} height="420px" />
      </div>
    </div>
  );
}
