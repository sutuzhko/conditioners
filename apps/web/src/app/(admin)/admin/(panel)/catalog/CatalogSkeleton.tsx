import { Skeleton } from '@/shared/ui';
import { LineSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/**
 * Строка счётчиков каталога до прихода данных (issue #334, #651).
 *
 * 🔴 Заготовка стоит в том же `<p>`, что и готовая строка, а не рядом с ним:
 * полоса другой высоты сдвинула бы отбор и таблицу ещё до того, как данные
 * приехали (ADR-239).
 */
export function CatalogSummarySkeleton() {
  return (
    <p className={styles.summary}>
      <LineSkeleton width="min(280px, 70%)" />
    </p>
  );
}

/**
 * Заготовка таблицы моделей (issue #334, ADR-239).
 *
 * Высота снята с готовой страницы: список приезжает на то же место, где стоит
 * серая полоса, и шапка с отбором над ним не двигается.
 */
export function CatalogTableSkeleton() {
  return <Skeleton variant="block" className={styles.tableSkeleton} />;
}
