import type { ElementType, HTMLAttributes, ReactNode } from 'react';

import styles from './CardBelt.module.css';

/**
 * Три пояса карточки: шапка, тело, подвал (issue #329).
 *
 * 🔴 Пояса живут в ките, а не собираются по месту. До этого каждый экран
 * панели рисовал шапку карточки своим `div` со своими отступами и своей
 * линией — а «своими» они были ровно до тех пор, пока экраны не встали
 * рядом. Отступы сняты с эталона (DESIGN_BRIEF §14): боковые `--pad-card`,
 * вертикальные у шапки и подвала `--pad-card-sm`.
 *
 * 🔴 Карточка с поясами идёт `padding="none"`: поля приносят пояса, и
 * сложенные с полем самой карточки они дают двойной отступ.
 */

const HEADINGS = { h2: 'h2', h3: 'h3', h4: 'h4', div: 'div' } as const;

export type CardHeadingLevel = keyof typeof HEADINGS;

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Заголовок пояса — слева. */
  title?: ReactNode | undefined;
  /** Строка под заголовком: уточнение, счётчик, дата. */
  subtitle?: ReactNode | undefined;
  /** Действие справа: кнопка, ссылка, меню строки. */
  action?: ReactNode | undefined;
  /**
   * Уровень заголовка. Умолчание `h3`, а не `h2`: карточка живёт внутри
   * раздела, у которого свой `h2`, и `h2` в ней пропускал бы уровень
   * (инвариант 4).
   */
  as?: CardHeadingLevel | undefined;
  /** Разделительная линия снизу; снимается у карточки без тела. */
  divider?: boolean | undefined;
  children?: ReactNode | undefined;
}

export function CardHeader({
  title,
  subtitle,
  action,
  as = 'h3',
  divider = true,
  className,
  children,
  ...rest
}: CardHeaderProps) {
  const Heading: ElementType = HEADINGS[as];

  return (
    <div
      {...rest}
      className={[styles.header, divider ? styles.divided : null, className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.headText}>
        {title === undefined ? null : <Heading className={styles.title}>{title}</Heading>}
        {subtitle === undefined ? null : <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
      {action === undefined ? null : <div className={styles.action}>{action}</div>}
    </div>
  );
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /**
   * Снять внутреннее поле: тело, целиком занятое таблицей, поля не имеет —
   * их приносят ячейки, и второй отступ отбивал бы таблицу от краёв карточки.
   */
  flush?: boolean | undefined;
}

export function CardBody({ children, flush = false, className, ...rest }: CardBodyProps) {
  return (
    <div
      {...rest}
      className={[styles.body, flush ? styles.flush : null, className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

export type CardFooterAlign = 'end' | 'between' | 'start';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Раскладка ряда: действия справа (умолчание), по краям или слева. */
  align?: CardFooterAlign | undefined;
  /** Разделительная линия сверху. */
  divider?: boolean | undefined;
}

export function CardFooter({
  children,
  align = 'end',
  divider = true,
  className,
  ...rest
}: CardFooterProps) {
  return (
    <div
      {...rest}
      className={[styles.footer, styles[align], divider ? styles.dividedTop : null, className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
