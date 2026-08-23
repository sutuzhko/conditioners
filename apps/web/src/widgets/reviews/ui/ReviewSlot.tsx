import { Card, Skeleton } from '@/shared/ui';

import styles from './ReviewSlot.module.css';

/**
 * Пустое место в ленте отзывов.
 *
 * 🔴 Это не «загрузка»: данные уже пришли, отзывов просто меньше, чем мест в
 * ряду. Ряд из двух карточек и полосы пустоты выглядит поломкой вёрстки, а
 * из карточек-заготовок — разделом, который ещё наполняется. Форму заготовки
 * повторяет ровно ту же, что у настоящей карточки: иначе при появлении
 * первого отзыва лента дёрнется.
 */
export function ReviewSlot() {
  return (
    <Card as="li" padding="none" elevation="none" className={styles.slot} aria-hidden="true">
      <div className={styles.body}>
        <Skeleton variant="block" width="96px" height="18px" />
        <Skeleton variant="text" lines={3} />
        <div className={styles.footer}>
          <Skeleton variant="circle" width="40px" height="40px" />
          <div className={styles.who}>
            <Skeleton variant="block" width="88px" height="14px" />
            <Skeleton variant="block" width="64px" height="12px" />
          </div>
        </div>
      </div>
    </Card>
  );
}
