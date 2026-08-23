import { reviewsContent as t } from '../content';
import styles from './ReviewHints.module.css';

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
            <svg
              className={styles.tick}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M20 6 9 17l-5-5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {hint}
          </li>
        ))}
      </ul>
    </div>
  );
}
