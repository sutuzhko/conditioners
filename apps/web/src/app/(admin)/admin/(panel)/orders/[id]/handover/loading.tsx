import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../../page.module.css';

/**
 * Сдача работы: шапка и три карточки — снимки, итог, оплата.
 *
 * Высоты держат место под то, что придёт: иначе экран, собранный на телефоне
 * по мобильной сети, прыгает под пальцем ровно в тот момент, когда монтажник
 * целится в «Сдать работу».
 */
export default function OrderHandoverLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton lines={1} />
      <RowsSkeleton rows={1} height="240px" />
      <RowsSkeleton rows={1} height="320px" />
      <RowsSkeleton rows={1} height="120px" />
    </div>
  );
}
