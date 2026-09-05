import { Skeleton } from '@/shared/ui';

import styles from './page.module.css';

/**
 * Заготовка очереди и карточки (issue #334, ADR-239).
 *
 * 🔴 Заготовка повторяет геометрию готового раздела, а не «примерно похожа»:
 * две колонки той же ширины на широком экране и одна на телефоне. Иначе
 * карточка, приехав, съезжает вбок ровно в момент, когда на неё смотрят.
 *
 * Высоты сняты с готовой страницы: очередь из восьми строк и карточка
 * типичного обращения — с моделью, комментарием и расчётом.
 */
export function LeadsSkeleton() {
  return (
    <div className={styles.block} aria-busy="true">
      <div className={styles.split}>
        <div className={styles.queue}>
          <Skeleton variant="block" className={styles.queueSkeleton} />
        </div>
        <div className={styles.detail}>
          <Skeleton variant="block" className={styles.detailSkeleton} />
        </div>
      </div>
    </div>
  );
}
