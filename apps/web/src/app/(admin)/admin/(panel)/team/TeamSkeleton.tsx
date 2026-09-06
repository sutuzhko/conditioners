import { Skeleton } from '@/shared/ui';

import styles from './page.module.css';

/**
 * Заготовка плиток показателей и таблицы команды (issue #334, #651, ADR-239).
 *
 * 🔴 Фрагмент, а не обёртка: страница раскладывает блоки колонкой с общим
 * зазором, и лишний `<div>` съел бы зазор между плитками и таблицей ровно на
 * время загрузки — заготовка обещала бы не ту геометрию.
 *
 * Ряд плиток и таблица одним блоком каждый: список стал таблицей (issue
 * #602), и четыре карточки на его месте обещали бы другую геометрию.
 */
export function TeamSkeleton() {
  return (
    <>
      <Skeleton variant="block" className={styles.tilesSkeleton} />
      <Skeleton variant="block" className={styles.rowSkeleton} />
    </>
  );
}
