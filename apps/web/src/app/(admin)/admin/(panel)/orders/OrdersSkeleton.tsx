import { Card, Skeleton } from '@/shared/ui';
import { RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/**
 * Заготовка стопок, ряда фильтров и таблицы нарядов (issue #334, #345, #651).
 *
 * 🔴 Фрагмент, а не обёртка: страница раскладывает блоки колонкой с общим
 * зазором, и лишний `<div>` съел бы зазор между стопками, фильтрами и
 * таблицей ровно на время загрузки (ADR-239).
 *
 * Высоты сняты с готовой страницы: лента стопок, ряд фильтров, шапка таблицы
 * и её строки.
 */
export function OrdersSkeleton() {
  return (
    <>
      <Skeleton variant="block" className={styles.tabsSkeleton} />
      <Skeleton variant="block" className={styles.filtersSkeleton} />

      <Card as="section" padding="none">
        <Skeleton variant="block" className={styles.headSkeleton} />
        <RowsSkeleton rows={4} className={styles.rowSkeleton} />
      </Card>
    </>
  );
}

/**
 * Наряд дня монтажника: лента дня и карточки выездов.
 *
 * Экран монтажника собирается на телефоне по мобильной сети — заготовка
 * держит место под то, что придёт, чтобы кнопки не прыгали под пальцем.
 */
export function OrdersAgendaSkeleton() {
  return (
    <>
      <Skeleton variant="block" className={styles.tabsSkeleton} />
      <RowsSkeleton rows={3} className={styles.rowSkeleton} />
    </>
  );
}
