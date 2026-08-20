import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import type { ButtonAppearance } from './Button';
import { buttonClassName } from './Button';
import styles from './Button.module.css';

/** Пропсы наследуем у самого Link: в проекте включены типизированные маршруты,
    и адрес обязан проверяться компилятором. */
type NextLinkProps = ComponentProps<typeof Link>;

export type ButtonLinkHref = NextLinkProps['href'];

export interface ButtonLinkProps
  extends Omit<NextLinkProps, 'className' | 'children'>, ButtonAppearance {
  children: ReactNode;
  className?: string | undefined;
  iconStart?: ReactNode | undefined;
  iconEnd?: ReactNode | undefined;
}

/**
 * Ссылка в оформлении кнопки. Отдельный компонент, а не флаг у Button:
 * «Оставить заявку» и телефон в шапке — это ссылки, и они обязаны
 * открываться средним кликом и попадать в индекс как ссылки.
 */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  iconStart,
  iconEnd,
  className,
  children,
  href,
  ...rest
}: ButtonLinkProps) {
  const classes = [buttonClassName({ variant, size, fullWidth }), className]
    .filter(Boolean)
    .join(' ');

  return (
    <Link {...rest} href={href} className={classes}>
      <span className={styles.content}>
        {iconStart}
        <span className={styles.label}>{children}</span>
        {iconEnd}
      </span>
    </Link>
  );
}
