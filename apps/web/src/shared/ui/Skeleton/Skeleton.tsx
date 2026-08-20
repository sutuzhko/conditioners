import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

export type SkeletonVariant = 'text' | 'block' | 'circle';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  /** количество строк для variant="text" */
  lines?: number;
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ variant = 'text', lines = 1, width, height, className }: SkeletonProps) {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = width;
  if (height !== undefined) style.height = height;

  // скелетон — чистая декорация: скринридер должен услышать не его,
  // а aria-busy на контейнере, который данные загружает
  const shared = { 'aria-hidden': true as const };

  if (variant === 'text' && lines > 1) {
    return (
      <span
        {...shared}
        className={[styles.lines, className].filter(Boolean).join(' ')}
        style={style}
      >
        {Array.from({ length: lines }, (_, index) => (
          <span key={index} className={[styles.skeleton, styles.text].join(' ')} />
        ))}
      </span>
    );
  }

  return (
    <span
      {...shared}
      className={[styles.skeleton, styles[variant], className].filter(Boolean).join(' ')}
      style={style}
    />
  );
}
