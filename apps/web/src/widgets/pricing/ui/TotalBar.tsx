import { useId } from 'react';

import { formatMoney } from '@/shared/lib/format';
import { ButtonLink, Skeleton, type ButtonLinkHref } from '@/shared/ui';

import { pricingText } from '../content';
import styles from './TotalBar.module.css';

/**
 * Состояние полосы итога.
 *
 * - `ready` — сумма посчитана и её можно назвать;
 * - `pending` — ввод изменился, показанная сумма устарела;
 * - `onsite` — по формуле честной суммы не выходит, называем по звонку.
 */
export type TotalState = 'ready' | 'pending' | 'onsite';

export type TotalBarProps = (
  | { readonly state: 'ready'; readonly amount: number }
  /* 🔴 Суммы у этих состояний нет и в типе: полоса не может показать число
     там, где числа не обещано (красная линия «не врать в цене»). */
  | { readonly state: 'pending' | 'onsite' }
) & {
  /** Куда ведёт призыв: адрес формы заявки готовит вызывающий. */
  readonly href: ButtonLinkHref;
  /** Что запомнить в момент перехода к форме. */
  readonly onApply?: (() => void) | undefined;
  /** Липкость и поля задаёт карточка, внутри которой полоса стоит. */
  readonly className?: string | undefined;
};

/**
 * Полоса итога калькулятора: подпись слева, сумма справа, призыв под ними.
 *
 * 🔴 Высота полосы одинакова во всех трёх состояниях. Строка значения держит
 * `min-height`, а скелетон повторяет ширину суммы — иначе при каждом
 * пересчёте полоса меняла бы высоту, и вместе с ней прыгала бы кнопка и всё,
 * что ниже по странице (CLS на самой длинной секции).
 */
export function TotalBar(props: TotalBarProps) {
  const { state, href, onApply, className } = props;
  // подпись связывается со значением явно: рядом на странице живёт ползунок,
  // и его <output> без этого сливается с итогом в один безымянный «статус»
  const labelId = useId();
  const busy = state === 'pending';

  const classes = [styles.total, className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <p className={styles.value}>
        <span className={styles.label} id={labelId}>
          {pricingText.totalLabel}
        </span>
        <output className={styles.output} aria-labelledby={labelId} aria-busy={busy || undefined}>
          {state === 'ready' ? (
            <span className={styles.amount}>{formatMoney(props.amount)}</span>
          ) : null}
          {state === 'pending' ? (
            <>
              <Skeleton variant="block" className={styles.skeleton} />
              {/* скелетон нарисован для глаза и спрятан от голоса — состояние
                  «считаем» голосу сообщает эта строка и aria-busy */}
              <span className="srOnly">{pricingText.totalPending}</span>
            </>
          ) : null}
          {state === 'onsite' ? <span className={styles.onsite}>{pricingText.onSite}</span> : null}
        </output>
      </p>

      {/* 🔴 Кнопка приносит к форме свою тему (ADR-129): человек считал смету
          на монтаж, и спрашивать его об этом ещё раз незачем. Пока сумма
          пересчитывается, переход гасится — но кнопка остаётся в обходе с
          клавиатуры и не теряет имени: `aria-disabled`, а не `disabled` и не
          `visibility: hidden` (ADR-159). */}
      <ButtonLink
        href={href}
        size="lg"
        className={styles.apply}
        aria-disabled={busy || undefined}
        onClick={(event) => {
          if (busy) {
            event.preventDefault();
            return;
          }
          onApply?.();
        }}
      >
        {pricingText.apply}
      </ButtonLink>
    </div>
  );
}
