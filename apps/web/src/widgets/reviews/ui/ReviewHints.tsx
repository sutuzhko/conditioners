import { reviewsContent as t } from '../content';
import styles from './ReviewHints.module.css';
import { Icon } from '@/shared/ui';

/**
 * Памятка тому, кто пишет отзыв.
 *
 * 🔴 Стоит рядом с формой всегда, а не только у пустого раздела. Раньше она
 * жила внутри приглашения «первый отзыв ещё не написан» и исчезала вместе с
 * ним — то есть ровно тогда, когда отзывы начинают приходить и подсказка
 * нужнее всего. От количества чужих отзывов она не зависит: это инструкция
 * для того, кто уже решил написать свой.
 */
export function ReviewHints() {
  return (
    <div className={styles.hints}>
      <p className={styles.title}>{t.hintsLabel}</p>
      <ul className={styles.list}>
        {t.hints.map((hint) => (
          <li key={hint} className={styles.item}>
            <Icon name="check" size={16} className={styles.tick} />
            {hint}
          </li>
        ))}
      </ul>
    </div>
  );
}
