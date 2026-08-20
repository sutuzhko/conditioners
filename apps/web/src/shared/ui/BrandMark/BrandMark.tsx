import styles from './BrandMark.module.css';

/**
 * Знак бренда 1a «Поток» (docs/DESIGN_BRIEF.md §11) — инлайн-SVG, а не <img>:
 * так знак наследует тему через CSS-переменные и не стоит лишнего запроса.
 *
 * Знак нужен шапке, футеру, письмам и админке, поэтому живёт в UI Kit: копии
 * по блокам расходятся при первой же правке геометрии (ADR-030).
 */

/**
 * Толщина штриха зависит от размера — оптическая компенсация из макета
 * (DESIGN_BRIEF §11), а не небрежность: при 3.4 в шестнадцати пикселях струи
 * сливаются с плиткой.
 */
function strokeWidth(size: number): number {
  if (size >= 40) return 3.4;
  if (size >= 24) return 3.8;
  return 4.4;
}

/**
 * `auto` — знак следует теме страницы: на светлой плитка бирюзовая со струями
 * фоном, на тёмной светлеет. `onDark` — вариант для тёмной панели (футер,
 * тёмные блоки), который от темы не зависит: панель тёмная в обеих.
 */
export type BrandMarkTone = 'auto' | 'onDark';

export interface BrandMarkProps {
  /** сторона квадрата в пикселях; пропорции знака менять нельзя */
  size?: number | undefined;
  tone?: BrandMarkTone | undefined;
  className?: string | undefined;
}

export function BrandMark({ size = 38, tone = 'auto', className }: BrandMarkProps) {
  const stroke = strokeWidth(size);

  return (
    <svg
      className={[styles.mark, tone === 'onDark' ? styles.onDark : styles.auto, className]
        .filter(Boolean)
        .join(' ')}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect className={styles.tile} width="48" height="48" rx="13" />
      <path
        className={styles.jet}
        d="M9 17 C 16 13, 24 21, 39 16"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        className={styles.jet}
        d="M9 25 C 18 21, 28 29, 39 24"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        className={styles.jetSoft}
        d="M9 33 C 16 29, 24 37, 32 32"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  );
}
