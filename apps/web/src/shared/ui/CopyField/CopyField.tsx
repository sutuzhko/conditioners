'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '../Icon';
import styles from './CopyField.module.css';

export interface CopyFieldProps {
  /** Что копируется: адрес статьи, логин монтажника. */
  readonly value: string;
  /** Подпись над строкой. Без неё непонятно, что это за адрес. */
  readonly label?: string | undefined;
  readonly copyLabel?: string | undefined;
  readonly copiedLabel?: string | undefined;
  /** Моноширинный набор: адреса и логины так читаются посимвольно. */
  readonly mono?: boolean | undefined;
  readonly className?: string | undefined;
}

/**
 * Копируемая строка: адрес статьи, логин монтажника (issue #332).
 *
 * 🔴 Значение показано целиком и выделяется мышью. Кнопка копирования —
 * дополнение, а не единственный путь: буфер обмена доступен только по
 * защищённому соединению и только по жесту пользователя, и на http-стенде
 * `navigator.clipboard` отсутствует вовсе. Строка, которую можно только
 * «скопировать кнопкой», на таком стенде становится нечитаемой.
 *
 * 🔴 Результат объявляется словом, а не сменой значка: галочка вместо иконки
 * копирования ничего не сообщает озвучке. Подпись кнопки меняется на
 * «Скопировано», и `aria-live` доносит это до читалки.
 */
export function CopyField({
  value,
  label,
  copyLabel = 'Скопировать',
  copiedLabel = 'Скопировано',
  mono = true,
  className,
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* Таймер снимается при размонтировании: строка живёт в списке, который
     перерисовывается после каждого сохранения. */
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      {label === undefined ? null : <span className={styles.label}>{label}</span>}
      <div className={styles.row}>
        <span className={[styles.value, mono ? styles.mono : null].filter(Boolean).join(' ')}>
          {value}
        </span>
        <button
          type="button"
          className={styles.button}
          onClick={copy}
          aria-label={copied ? copiedLabel : `${copyLabel}: ${value}`}
        >
          <span aria-hidden="true">
            <Icon name={copied ? 'check' : 'bill'} size={16} />
          </span>
        </button>
      </div>
      {/* Область живёт всегда, а не появляется вместе с сообщением: пустой
          `aria-live`, вставленный в момент события, читалки не объявляют. */}
      <span className="srOnly" role="status" aria-live="polite">
        {copied ? copiedLabel : ''}
      </span>
    </div>
  );
}
