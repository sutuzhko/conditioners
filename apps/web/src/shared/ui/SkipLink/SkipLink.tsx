import type { ReactNode } from 'react';

import { buttonClassName } from '../Button/Button';
import styles from './SkipLink.module.css';

export interface SkipLinkProps {
  /** якорь основного содержимого страницы; текст и адрес приходят из shared/config */
  href: string;
  children: ReactNode;
}

/**
 * Ссылка «к содержимому» (WCAG 2.4.1). Стоит первой в body: владелец
 * клавиатуры перепрыгивает sticky-шапку одним Enter, а не проходит всё меню
 * на каждой странице заново.
 *
 * До фокуса ссылка спрятана за краем экрана, но остаётся в табе-порядке и в
 * дереве доступности; получив фокус, выглядит обычной кнопкой поверх шапки.
 * Серверный компонент: поведение целиком нативное — якорь и `:focus`.
 */
export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a href={href} className={[buttonClassName({ size: 'md' }), styles.skipLink].join(' ')}>
      {children}
    </a>
  );
}
