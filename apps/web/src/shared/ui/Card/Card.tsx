import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export type CardVariant = 'default' | 'soft' | 'accent' | 'panel';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
/** ступени радиуса из макета: 11 · 14 · 18 · 20 · 22 · 24 */
export type CardRadius = 'sm' | 'md' | 'ml' | 'lg' | 'xl' | 'xxl';
export type CardElevation = 'none' | 'card' | 'raised' | 'float';

const RADIUS_CLASS: Readonly<Record<CardRadius, string | undefined>> = {
  sm: styles.rSm,
  md: styles.rMd,
  ml: styles.rMl,
  lg: styles.rLg,
  xl: styles.rXl,
  xxl: styles.rXxl,
};

const ELEVATION_CLASS: Readonly<Record<CardElevation, string | undefined>> = {
  none: styles.elevNone,
  card: styles.elevCard,
  raised: styles.elevRaised,
  float: styles.elevFloat,
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  /** радиус: по умолчанию 20px — крупная карточка из макета */
  radius?: CardRadius;
  /**
   * Тень. Без пропа её решает вариант: у `default` — `--shadow-card`,
   * у остальных тени нет. Задаётся отдельно, потому что в макете глубина
   * не следует за поверхностью: карточка услуг в покое без тени,
   * карточка подбора — с глубокой.
   */
  elevation?: CardElevation;
  /** рамка; выключается у карточки формы на тёмной секции — в макете её нет */
  bordered?: boolean;
  /** реагировать на наведение: карточка модели, статьи — то, что ведёт по ссылке */
  interactive?: boolean;
  /** семантический тег: article для карточки статьи или отзыва, li внутри списка */
  as?: ElementType;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  radius,
  elevation,
  bordered = true,
  interactive = false,
  as: Tag = 'div',
  className,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    styles[variant],
    styles[padding],
    radius === undefined ? null : RADIUS_CLASS[radius],
    elevation === undefined ? null : ELEVATION_CLASS[elevation],
    bordered ? null : styles.borderless,
    interactive ? styles.interactive : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag {...rest} className={classes}>
      {children}
    </Tag>
  );
}
