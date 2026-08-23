import { reviewModalContent as t } from './content';
import styles from './ReviewHints.module.css';
import { Icon } from '@/shared/ui';

/**
 * Памятка тому, кто пишет отзыв.
 *
 * 🔴 Живёт в окне формы, а не на странице. Подсказка нужна в момент
 * заполнения: тому, кто просто читает чужие отзывы, она занимает место, а
 * тому, кто уже начал писать, — объясняет, что от него ждут. От количества
 * чужих отзывов она не зависит вовсе.
 */
export interface ReviewHintsProps {
  readonly className?: string | undefined;
}

export function ReviewHints({ className }: ReviewHintsProps) {
  return (
    <div className={[styles.hints, className].filter(Boolean).join(' ')}>
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
