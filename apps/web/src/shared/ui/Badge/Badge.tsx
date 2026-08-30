import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Badge.module.css';

/**
 * 🔴 Шесть семантических красок панели — закрытый словарь (ADR-081,
 * `design/admin/Kit.body.html`). Седьмой не заводится: вместо неё уточняется
 * подпись. Значение краски одно на всю панель, и по месту не подбирается:
 *
 * - `neutral` — покой, действий не требует: «Новый», «Снят», «На модерации»;
 * - `accent` — в работе: «В работе», «Менеджер взял»;
 * - `warning` — ждёт действия человека: «Назначен», «Новая заявка», «На исходе»;
 * - `success` — завершено успешно: «Выполнен», «Доставлено», «В наличии»;
 * - `danger` — отказ, провал, просрочка: «Отказ», «Просрочен», «Пора заказать»;
 * - `info` — ждёт систему: «В очереди».
 *
 * `dark`, `onPanel` и `sale` — не статусы: это оформление витрины. `sale`
 * остаётся единственным тёплым акцентом сайта (DESIGN_BRIEF §10) и в панели
 * не используется вовсе.
 */
export type BadgeVariant =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'dark'
  /** для всегда-тёмных панелей: accent зависит от темы, а панель — нет */
  | 'onPanel'
  | 'sale';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /**
   * Точка перед подписью — она декоративна и от озвучки скрыта.
   *
   * 🔴 Слово при этом обязательно (`design/admin/Kit.body.html`): шесть красок
   * панели различает не всякий глаз, а на чёрно-белой печати наряда они
   * совпадают все. Точка усиливает краску, но не заменяет подпись.
   */
  dot?: boolean;
  /** моноширинная техническая метка: «СХЕМА 1», «ШАГ 2» */
  mono?: boolean;
  /**
   * Разрешить перенос строки.
   *
   * 🔴 По умолчанию плашка не переносится: она пилюля, и «Класс 09» или
   * «−15%», сломанные пополам, читаются как ошибка вёрстки. Но там, где текст
   * приходит из настроек, длину задаёт владелец — и плашка, которая ломается
   * от шестого слова, не решение (ADR-126). Такие места включают перенос
   * явно, чтобы выбор был виден в месте вызова, а не спрятан в ките.
   */
  wrap?: boolean;
  /**
   * Снять плашку — крестик справа от подписи.
   *
   * 🔴 Крестик рисуется настоящей кнопкой с именем, а не значком по клику на
   * плашке: цель 12×12 без имени озвучка называет «плашка», и снять фильтр
   * с клавиатуры нельзя вовсе. Плашка остаётся `<span>`: снимают её, а не
   * нажимают — интерактивная плашка это `Chip`.
   */
  onRemove?: (() => void) | undefined;
  /** имя кнопки снятия; по умолчанию — «Убрать» */
  removeLabel?: string | undefined;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  mono = false,
  wrap = false,
  onRemove,
  removeLabel = 'Убрать',
  className,
  ...rest
}: BadgeProps) {
  const classes = [
    styles.badge,
    styles[variant],
    styles[size],
    mono ? styles.mono : null,
    wrap ? styles.wrap : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span {...rest} className={classes}>
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {children}
      {onRemove === undefined ? null : (
        <button type="button" className={styles.remove} aria-label={removeLabel} onClick={onRemove}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
