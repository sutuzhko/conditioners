import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import styles from './Button.module.css';

/**
 * Семь заливок эталона (ADR-170, `design/admin/_base.css`). Порядок — от
 * самой громкой к самой тихой, плюс разрушающая:
 *
 * - `solid` — основное действие экрана, оно на экране одно;
 * - `flat` — действие рядом с основным: заливка акцентом низкой плотности;
 * - `bordered` — равноправная альтернатива, обведённая линией контрола;
 * - `faded` — служебное действие в плотном ряду;
 * - `light` — действие без формы: ссылка, притворяющаяся кнопкой;
 * - `ghost` — обведённая фирменной линией и пустая внутри;
 * - `danger` — удаление и отказ.
 */
export type ButtonVariant = 'solid' | 'flat' | 'bordered' | 'faded' | 'light' | 'ghost' | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonAppearance {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** растянуть на всю ширину контейнера — форма на мобильном */
  fullWidth?: boolean | undefined;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonAppearance {
  /** состояние отправки: кнопка блокируется, подпись подменяется индикатором */
  loading?: boolean | undefined;
  /**
   * Почему кнопка недоступна. Названная причина меняет способ отключения:
   * вместо нативного `disabled` кнопка получает `aria-disabled` и остаётся в
   * обходе с клавиатуры.
   *
   * 🔴 Иначе до причины не добраться. Нативный `disabled` убирает кнопку из
   * фокуса и из дерева доступности — человек, который не видит экрана,
   * упирается в действие, которого просто нет, и объяснения не получает.
   * Работает только вместе с `disabled`: причина без отказа — это подсказка,
   * а не состояние.
   *
   * Причина уходит в имя кнопки скрытой строкой, а не в `aria-describedby`:
   * идентификатор потребовал бы `useId`, а с хуком компонент перестал бы
   * рисоваться из серверного — сейчас так его зовут карточка каталога, шапка
   * и страница 404.
   */
  disabledReason?: string | undefined;
  iconStart?: ReactNode | undefined;
  iconEnd?: ReactNode | undefined;
}

/** Собирает набор классов, общий для кнопки и ссылки-кнопки. */
export function buttonClassName({
  variant = 'solid',
  size = 'md',
  fullWidth = false,
}: ButtonAppearance): string {
  return [styles.button, styles[variant], styles[size], fullWidth ? styles.fullWidth : null]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  disabledReason,
  iconStart,
  iconEnd,
  disabled,
  onClick,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const off = disabled === true || loading;
  // отказ с объяснением: фокус сохраняется, нажатие гасится обработчиком
  const soft = disabled === true && !loading && disabledReason !== undefined;

  const classes = [
    buttonClassName({ variant, size, fullWidth }),
    loading ? styles.loading : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  /* 🔴 Обработчик подставляется только там, где он был.
     Функция в пропсах серверного компонента не сериализуется: React отвечает
     «Event handlers cannot be passed to Client Component props» и роняет
     страницу целиком — а кнопку без обработчика зовут карточка каталога,
     шапка и все разделы панели. Гасить при этом нечего: кнопка, которой
     ничего не передали, по нажатию и так ничего не делает. */
  const handleClick =
    onClick === undefined
      ? undefined
      : (event: MouseEvent<HTMLButtonElement>) => {
          if (soft) {
            // и клик, и Enter приходят сюда: отмена гасит заодно отправку формы
            event.preventDefault();
            return;
          }
          onClick(event);
        };

  return (
    <button
      {...rest}
      /* Отказ снимает отправку формы: «мягко отключённая» кнопка нативного
         `disabled` не имеет, и `submit` без этой подмены ушёл бы по Enter. */
      type={soft ? 'button' : type}
      className={classes}
      onClick={handleClick}
      disabled={off && !soft}
      aria-disabled={off || undefined}
      aria-busy={loading || undefined}
    >
      <span className={styles.content}>
        {iconStart}
        <span className={styles.label}>{children}</span>
        {iconEnd}
      </span>
      {soft ? <span className={styles.reason}>{disabledReason}</span> : null}
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
    </button>
  );
}
