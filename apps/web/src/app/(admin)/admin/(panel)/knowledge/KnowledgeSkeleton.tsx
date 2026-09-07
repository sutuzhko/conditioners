import { Skeleton } from '@/shared/ui';
import { BusyGroup, LineSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/**
 * Строка счётчиков раздела до прихода данных (issue #334, #651).
 *
 * 🔴 Заготовка стоит в том же `<p>`, что и готовая строка: полоса другой
 * высоты сдвинула бы отбор и таблицу ещё до прихода данных (ADR-239).
 */
export function KnowledgeSummarySkeleton() {
  return (
    /* `aria-busy` прямо на абзаце: контейнер здесь настоящий (issue #579). */
    <p className={styles.summary} aria-busy="true">
      <LineSkeleton width="min(280px, 70%)" />
    </p>
  );
}

/** Заготовка таблицы статей: та же высота, что у готового списка. */
export function KnowledgeTableSkeleton() {
  return (
    <BusyGroup>
      <Skeleton variant="block" className={styles.tableSkeleton} />
    </BusyGroup>
  );
}
