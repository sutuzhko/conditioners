import { Skeleton } from '@/shared/ui';

import styles from './page.module.css';

/**
 * Заготовка поиска и списка клиентов (issue #334, #651, ADR-239).
 *
 * 🔴 Фрагмент, а не обёртка: страница раскладывает свои блоки колонкой с
 * общим зазором, и лишний `<div>` съел бы зазор между поиском и списком
 * ровно на время загрузки — то есть заготовка обещала бы не ту геометрию.
 *
 * Высоты сняты с готовой страницы: карточка поиска и таблица. Список стал
 * таблицей (issue #602), и четыре карточки на его месте обещали бы другую
 * геометрию.
 */
export function ClientsSkeleton() {
  return (
    <>
      <Skeleton variant="block" className={styles.searchSkeleton} />
      <Skeleton variant="block" className={styles.rowSkeleton} />
    </>
  );
}
