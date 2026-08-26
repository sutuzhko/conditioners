import Link from 'next/link';
import type { ReactNode } from 'react';

import type { ButtonLinkHref } from '@/shared/ui';

import styles from './FilterLink.module.css';

export interface FilterLinkProps {
  readonly href: ButtonLinkHref;
  readonly selected: boolean;
  readonly children: ReactNode;
}

/**
 * Значение фильтра или порядка — ссылкой.
 *
 * 🔴 Ссылка, а не `Chip` из UI Kit: чип — это кнопка с состоянием на клиенте,
 * а выбранный фильтр обязан жить в адресе (ADR-109). Ссылками фильтр работает
 * без единого килобайта JavaScript, открывается в новой вкладке и переживает
 * пересылку — а робот проходит по нему и находит модели, до которых иначе не
 * добрался бы.
 *
 * `aria-current="true"`, а не `aria-pressed`: у ссылки нет состояния нажатия,
 * есть «это текущий выбор».
 */
export function FilterLink({ href, selected, children }: FilterLinkProps) {
  return (
    <Link
      href={href}
      className={selected ? `${styles.link} ${styles.selected}` : styles.link}
      aria-current={selected ? 'true' : undefined}
    >
      {children}
    </Link>
  );
}
