import { Skeleton } from '@/shared/ui';

import styles from './skeletons.module.css';

/**
 * Скелетоны разделов панели.
 *
 * 🔴 Переходы в панели — клиентская навигация: документ не перезагружается, а
 * данные каждого раздела читаются на сервере по запросу (`force-dynamic`).
 * Пока идёт ответ, Next держит на экране прежнюю страницу — и нажатие
 * выглядит непроизошедшим. Отсюда жалоба «экран замирает на десять секунд».
 *
 * Скелетон повторяет раскладку своего раздела, а не показывает нейтральный
 * прямоугольник: подставленный вместо формы список — обещание, которое
 * страница через мгновение нарушит, и глаз перестраивается дважды.
 *
 * Ширины заданы в процентах и с разбросом: одинаковые полосы читаются как
 * таблица, а не как текст, который вот-вот появится.
 */

/** Заголовок раздела и пояснение под ним — они есть у каждой страницы панели. */
export function HeadSkeleton() {
  return (
    <div className={styles.head}>
      <Skeleton variant="block" width="min(280px, 62%)" height="30px" />
      <Skeleton variant="text" lines={2} width="min(560px, 92%)" />
    </div>
  );
}

export interface RowsSkeletonProps {
  /** Сколько строк показать. По умолчанию — экран без прокрутки. */
  readonly rows?: number | undefined;
  readonly height?: string | undefined;
}

/** Список карточек: заявки, отзывы, статьи, модели. */
export function RowsSkeleton({ rows = 4, height = '92px' }: RowsSkeletonProps) {
  return (
    <div className={styles.rows}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="block" height={height} />
      ))}
    </div>
  );
}

export interface FieldsSkeletonProps {
  readonly fields?: number | undefined;
}

/** Форма: подпись плюс поле, и так несколько раз. */
export function FieldsSkeleton({ fields = 5 }: FieldsSkeletonProps) {
  return (
    <div className={styles.fields}>
      {Array.from({ length: fields }, (_, index) => (
        <div className={styles.field} key={index}>
          <Skeleton variant="block" width="34%" height="13px" />
          <Skeleton variant="block" height="42px" />
        </div>
      ))}
    </div>
  );
}

/** Сетка месяца в календаре работ: шесть недель по семь дней. */
export function MonthSkeleton() {
  return (
    <div className={styles.month}>
      {Array.from({ length: 42 }, (_, index) => (
        <Skeleton key={index} variant="block" className={styles.cell} />
      ))}
    </div>
  );
}
