import Image from 'next/image';
import type { ReactNode } from 'react';

import styles from './Avatar.module.css';

export type AvatarSize = 'sm' | 'md' | 'lg';

/** Пиксельный размер по ступени: нужен `next/image`, который требует чисел. */
const PIXELS: Readonly<Record<AvatarSize, number>> = { sm: 28, md: 36, lg: 48 };

/** Класс нахлёста по размеру ряда: у мелких аватаров он меньше. */
const GROUP_CLASS: Readonly<Record<AvatarSize, string | undefined>> = {
  sm: styles.groupSm,
  md: undefined,
  lg: styles.groupLg,
};

export interface AvatarProps {
  /** Имя человека. Из него берутся инициалы и имя для озвучки. */
  readonly name: string;
  /** Фотография. Без неё рисуются инициалы — это не «нет аватара», а аватар. */
  readonly src?: string | undefined;
  readonly size?: AvatarSize | undefined;
  readonly className?: string | undefined;
}

/**
 * Инициалы из имени: «Иванов Иван» → «ИИ», «Иванов» → «И».
 *
 * 🔴 Берутся первые буквы первых двух слов, а не первая и последняя. В
 * русском порядке «Фамилия Имя» первая и последняя дали бы «ИН» — фамилию и
 * хвост имени, что читается случайным набором букв.
 */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * Аватар монтажника, клиента, вошедшего пользователя (issue #332).
 *
 * 🔴 Серверный компонент: клиентского JS ноль. Фотография идёт через
 * `next/image` с заданными размерами — инвариант 13, и без этого аватар в
 * списке из двадцати строк даёт двадцать сдвигов вёрстки.
 */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const pixels = PIXELS[size];

  return (
    <span
      className={[styles.avatar, styles[size], className].filter(Boolean).join(' ')}
      /* Имя даётся картинке или тексту инициалов, а не обёртке: озвучка иначе
         прочитает и то и другое — «Иванов Иван, ИИ». */
      title={name}
    >
      {src === undefined ? (
        <span className={styles.initials} aria-hidden="true">
          {initials(name)}
        </span>
      ) : (
        <Image src={src} alt={name} width={pixels} height={pixels} className={styles.photo} />
      )}
      {src === undefined ? <span className="srOnly">{name}</span> : null}
    </span>
  );
}

export interface AvatarGroupProps {
  readonly children: ReactNode;
  /**
   * Сколько человек не поместилось. Показывается плиткой «+3» в конце ряда —
   * число, а не многоточие: «и ещё кто-то» ничего не сообщает.
   */
  readonly overflow?: number | undefined;
  readonly size?: AvatarSize | undefined;
  /** Имя ряда для озвучки: «Монтажники на наряде». */
  readonly label: string;
  readonly className?: string | undefined;
}

/**
 * Ряд аватаров внахлёст: каждый следующий накрывает предыдущего. Порядок
 * наложения даёт сам поток, и `z-index` тут не нужен ни одному элементу.
 */
export function AvatarGroup({
  children,
  overflow,
  size = 'md',
  label,
  className,
}: AvatarGroupProps) {
  return (
    <span
      className={[styles.group, GROUP_CLASS[size], className].filter(Boolean).join(' ')}
      role="group"
      aria-label={label}
    >
      {children}
      {overflow === undefined || overflow <= 0 ? null : (
        <span className={[styles.avatar, styles[size], styles.overflow].join(' ')}>
          <span aria-hidden="true">+{overflow}</span>
          <span className="srOnly">ещё {overflow}</span>
        </span>
      )}
    </span>
  );
}
