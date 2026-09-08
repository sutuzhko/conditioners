import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

/**
 * Заливки кнопки-значка. `danger` — удаление: строка прайса, характеристика,
 * поле справочника (issue #35).
 *
 * 🔴 Опасный вид — вариант кита, а не класс раздела. Разделов с удалением
 * строки три, и три собственных красных «✕» разошлись бы на первой правке
 * токена: у одного остался бы прежний оттенок, у другого — прежняя рамка.
 */
export type IconButtonVariant = 'solid' | 'outline' | 'ghost' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children'
> {
  /** обязателен: у кнопки без текста имя берётся только отсюда */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const classes = [styles.iconButton, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(' ');

  /* 🔴 Имя одно (ADR-159). `aria-label` и `title` с одинаковым текстом часть
     читалок объявляет дважды — «Удалить, Удалить». Имя даёт `aria-label`;
     `title` остаётся ради всплывающей подсказки мыши и потому спрятан от
     дерева доступности вместе с иконкой. */
  return (
    <button {...rest} type={type} className={classes} aria-label={label}>
      <span aria-hidden="true" title={label}>
        {icon}
      </span>
    </button>
  );
}
