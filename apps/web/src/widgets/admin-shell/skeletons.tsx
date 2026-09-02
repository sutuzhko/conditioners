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
 * 🔴 Высота — не на глаз, а по замеру готовой страницы (issue #334): каждая
 * заготовка стоит в строчном боксе того же кегля и той же высоты строки, что
 * и текст на её месте. Полоса в 30px вместо заголовка в 45.6px сдвигала всё
 * ниже на 16px ещё до того, как приезжали данные.
 */

export interface HeadSkeletonProps {
  /** Сколько строк занимает пояснение под заголовком; 0 — пояснения нет. */
  readonly lines?: number | undefined;
  /**
   * В строке заголовка стоит действие. На сенсорной раскладке кнопка выше
   * заголовка — строка тянется до цели 44px (ADR-183).
   */
  readonly action?: boolean | undefined;
}

/** Заголовок раздела и пояснение под ним — там, где заголовок зависит от данных. */
export function HeadSkeleton({ lines = 2, action = false }: HeadSkeletonProps) {
  return (
    <div className={styles.head}>
      <div
        className={[styles.headTitle, action ? styles.headAction : null].filter(Boolean).join(' ')}
      >
        <Skeleton variant="block" width="min(280px, 62%)" height="0.75em" />
      </div>

      {lines === 0 ? null : (
        <div className={styles.headLead}>
          {Array.from({ length: lines }, (_, index) => (
            <LineSkeleton
              key={index}
              width={index === lines - 1 && lines > 1 ? 'min(320px, 48%)' : 'min(560px, 92%)'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface LineSkeletonProps {
  readonly width?: string | undefined;
}

/**
 * Одна строка текста: заготовка в 1em внутри бокса высотой строки. Кегль и
 * высота строки наследуются от места, где стоит заготовка, — так подпись под
 * заголовком и служебная строка получают каждая свою высоту.
 */
export function LineSkeleton({ width = '100%' }: LineSkeletonProps) {
  return (
    <span className={styles.line}>
      <Skeleton variant="text" width={width} />
    </span>
  );
}

export interface RowsSkeletonProps {
  /** Сколько строк показать. По умолчанию — экран без прокрутки. */
  readonly rows?: number | undefined;
  readonly height?: string | undefined;
  /**
   * Класс строки — для высоты по ширине экрана: карточка заявки на 390
   * вдвое выше, чем на 1440, и одним числом её не описать. Класс задаёт
   * `min-height`, а не `height`: у заготовки своя высота `100%`, и при равной
   * специфичности победил бы порядок подключения модулей (ADR-038).
   */
  readonly className?: string | undefined;
}

/**
 * Список карточек: заявки, отзывы, статьи, модели.
 *
 * `aria-busy` стоит на контейнере, а не на заготовках: те скрыты от озвучки,
 * а «идёт загрузка» сообщает блок — и сквозные сценарии находят скелетон по
 * этому признаку, а не по классам.
 */
export function RowsSkeleton({ rows = 4, height, className }: RowsSkeletonProps) {
  return (
    <div className={styles.rows} aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton
          key={index}
          variant="block"
          height={className === undefined ? (height ?? '92px') : height}
          className={className}
        />
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
    <div className={styles.fields} aria-busy="true">
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
    <div className={styles.month} aria-busy="true">
      {Array.from({ length: 42 }, (_, index) => (
        <Skeleton key={index} variant="block" className={styles.cell} />
      ))}
    </div>
  );
}
