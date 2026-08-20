import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export type CardVariant = 'default' | 'soft' | 'accent' | 'panel';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  /** реагировать на наведение: карточка модели, статьи — то, что ведёт по ссылке */
  interactive?: boolean;
  /** семантический тег: article для карточки статьи или отзыва, li внутри списка */
  as?: ElementType;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  interactive = false,
  as: Tag = 'div',
  className,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    styles[variant],
    styles[padding],
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
