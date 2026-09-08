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
  /**
   * Уйти по адресу настоящей перезагрузкой, а не переходом внутри приложения.
   *
   * 🔴 Нужен ровно там, откуда клиентский переход не выводит: на странице
   * отказа. Отказ бросает раскладка панели, а раскладка — общий кусок дерева
   * для всех её разделов; переход между двумя разделами одной раскладки
   * переиспользует её кусок из кеша роутера, то есть тот самый, который и
   * бросил отказ. Адрес меняется, страница остаётся прежней — человек стоит
   * на открытом ему разделе и читает «Раздел закрыт» (ADR-344).
   *
   * Перезагрузка снимает вопрос целиком: сервер собирает раскладку заново и
   * проверяет доступ для нового адреса. Ценой полной загрузки — на странице
   * отказа это не та цена, о которой стоит спорить.
   */
  reload?: boolean | undefined;
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
  reload = false,
  ...rest
}: ButtonLinkProps) {
  const classes = [buttonClassName({ variant, size, fullWidth }), className]
    .filter(Boolean)
    .join(' ');

  const content = (
    <span className={styles.content}>
      {iconStart}
      <span className={styles.label}>{children}</span>
      {iconEnd}
    </span>
  );

  /* Адрес объектом (`UrlObject`) перезагрузкой не открывается: у обычного
     якоря адрес — строка. Типизированные маршруты проекта строками и
     являются, поэтому сужения достаточно; объект остаётся переходом внутри
     приложения, как и был. */
  if (reload && typeof href === 'string') {
    return (
      <a {...rest} href={href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <Link {...rest} href={href} className={classes}>
      {content}
    </Link>
  );
}
