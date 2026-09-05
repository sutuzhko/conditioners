import Link from 'next/link';

import { Card, Input, Select, buttonClassName } from '@/shared/ui';

import { reviewModerationContent as texts } from './content';
import {
  REVIEWS_PATH,
  REVIEW_RATINGS,
  REVIEW_STATUSES,
  reviewFilterOn,
  reviewsHref,
  type ReviewFilter,
} from './model';
import styles from './ReviewFilters.module.css';

export interface ReviewFiltersProps {
  /** Отбор, с которым страница отрисована: поля открываются заполненными. */
  readonly filter: ReviewFilter;
}

/**
 * Сквозной отбор вкладки «Все»: поиск, статус и оценка (issue #613, макет
 * `ContentTabs`, вкладка 4).
 *
 * 🔴 Серверный компонент без единой строки своего JavaScript. Обычная форма с
 * `method="get"` уводит условия в адрес сама, и вкладка не платит за отбор ни
 * байтом бюджета. Найденное остаётся ссылкой — её можно прислать себе.
 *
 * Вкладка едет скрытым полем: без неё поиск возвращал бы на «На модерации» —
 * то есть на другую вкладку с другим набором отзывов.
 */
export function ReviewFilters({ filter }: ReviewFiltersProps) {
  return (
    <Card as="section" className={styles.card}>
      <form className={styles.form} action={REVIEWS_PATH} method="get" role="search">
        <input type="hidden" name="tab" value="all" />

        <Input
          label={texts.searchLabel}
          hint={texts.searchHint}
          placeholder={texts.searchPlaceholder}
          name="q"
          type="search"
          defaultValue={filter.query}
          autoComplete="off"
          wrapperClassName={styles.field}
        />

        <Select
          label={texts.filterStatus}
          name="status"
          defaultValue={filter.status ?? ''}
          wrapperClassName={styles.select}
          options={[
            { value: '', label: texts.filterStatusAll },
            ...REVIEW_STATUSES.map((status) => ({
              value: status,
              label: texts.statusTitle(status),
            })),
          ]}
        />

        <Select
          label={texts.filterRating}
          name="rating"
          defaultValue={filter.rating === undefined ? '' : String(filter.rating)}
          wrapperClassName={styles.select}
          options={[
            { value: '', label: texts.filterRatingAll },
            ...REVIEW_RATINGS.map((value) => ({
              value: String(value),
              label: texts.filterRatingOption(value),
            })),
          ]}
        />

        <div className={styles.actions}>
          <button className={buttonClassName({ size: 'sm' })} type="submit">
            {texts.searchSubmit}
          </button>

          {/* Сброс — ссылка, а не кнопка: условия живут в адресе, и снять их
              значит уйти на ту же вкладку без хвоста. */}
          {reviewFilterOn(filter) ? (
            <Link className={`${styles.reset} tapAction`} href={reviewsHref('all')}>
              {texts.reset}
            </Link>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
