import { Card, Skeleton } from '@/shared/ui';

import styles from './ReviewSlot.module.css';

/**
 * Пустое место в ленте отзывов.
 *
 * 🔴 Это не «загрузка»: данные уже пришли, отзывов просто меньше, чем мест в
 * ленте. Лента из двух карточек и полосы пустоты выглядит поломкой вёрстки,
 * а из карточек-заготовок — разделом, который ещё наполняется. Форму
 * заготовки повторяет ровно ту же, что у настоящей карточки: иначе при
 * появлении первого отзыва лента дёрнется.
 *
 * 🔴 Заготовка живёт только в ленте, то есть с 1200px (issue #274). Ниже
 * отзывы лежат колонкой и сеткой, и там пустая карточка рядом с настоящим
 * отзывом читалась бы как сбой загрузки — её прячет стиль списка.
 */
export function ReviewSlot({ kind = 'slot' }: { readonly kind?: 'slot' | 'loop' | undefined }) {
  return (
    <Card
      as="li"
      padding="none"
      elevation="none"
      className={styles.slot}
      data-role={kind}
      aria-hidden="true"
    >
      <div className={styles.body}>
        <Skeleton variant="block" width="96px" height="18px" />
        <Skeleton variant="text" lines={3} />
        <div className={styles.footer}>
          <Skeleton variant="circle" width="36px" height="36px" />
          <div className={styles.who}>
            <Skeleton variant="block" width="88px" height="14px" />
            <Skeleton variant="block" width="64px" height="12px" />
          </div>
        </div>
      </div>
    </Card>
  );
}
