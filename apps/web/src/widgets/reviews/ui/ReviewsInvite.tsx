import { Card } from '@/shared/ui';

import { reviewsContent as t } from '../content';
import card from './ReviewCard.module.css';
import styles from './ReviewsInvite.module.css';

/**
 * 🔴 Пустое состояние раздела — его основное состояние.
 *
 * Настоящих отзывов у проекта пока нет, а выдуманные публиковать запрещено
 * (инвариант 10, ADR-012). Поэтому вместо серого «отзывов пока нет» здесь
 * объяснение, почему раздел пуст.
 *
 * 🔴 Карточка повторяет разметку настоящего отзыва — те же стили, тот же
 * подвал с автором и датой. Иначе она выпадает из ряда и читается как
 * поломка вёрстки, а не как место, куда встанет первый отзыв. Подпись при
 * этом честная: видно, что пишет компания, а не клиент.
 *
 * Кнопки внутри нет: такая же стоит над лентой, и вторая на одном экране
 * заставляет выбирать между двумя одинаковыми.
 *
 * Размер — ровно как у соседей: один слот, та же высота, тот же подвал.
 * Объединять ячейки нельзя: широкая карточка ломает кладку, и нижний ряд
 * наезжает сам на себя.
 */
export function ReviewsInvite() {
  return (
    <Card as="li" padding="none" elevation="none" className={`${card.card} ${styles.invite}`}>
      <article className={card.body}>
        <blockquote className={card.quote}>
          <p className={styles.title}>{t.emptyTitle}</p>
          <p className={card.text}>{t.emptyText}</p>
        </blockquote>

        <footer className={card.footer}>
          <span className={card.avatar} aria-hidden="true">
            {t.emptyAuthorInitial}
          </span>
          <span className={card.who}>
            <span className={card.name}>{t.emptyAuthor}</span>
            <span className={card.meta}>{t.emptyWhen}</span>
          </span>
        </footer>
      </article>
    </Card>
  );
}
