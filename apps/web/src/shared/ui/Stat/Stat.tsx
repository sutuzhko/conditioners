'use client';

import { formatNumber } from '@/shared/lib/format';
import { useCountUp } from '@/shared/lib/useCountUp';

import styles from './Stat.module.css';

/**
 * Счётчик достижений: «1200+ установок в Туле».
 *
 * 🔴 Цифра — факт о компании, она приходит из настроек и нигде не
 * подставляется по умолчанию (инварианты 8 и 10). Пустой список — компонента
 * нет вовсе: пустой `<dl>` в разметке это обещание цифр, которых нет.
 *
 * Клиентским компонент делает только отсчёт: `useCountUp` стартует с конечного
 * значения, поэтому в серверном HTML стоит настоящее число (инвариант 1).
 */

export type StatItem = {
  /** Число, которое отсчитывает счётчик. */
  readonly value: number;
  /** Хвост после числа: «+», « года», « день». Склонение задаёт владелец данных. */
  readonly suffix?: string | undefined;
  readonly label: string;
};

/**
 * `default` — цифры на фоне страницы, `onPanel` — на тёмной панели, где текст
 * выводится из `--on-panel`. Различие только в цвете и кегле; раскладку ряда
 * задаёт блок своим классом — она часть его ритма, а не счётчика.
 */
export type StatTone = 'default' | 'onPanel';

export interface StatListProps {
  readonly items: readonly StatItem[];
  readonly tone?: StatTone | undefined;
  /** Подпись списка для скринридера, если рядом нет заголовка. */
  readonly label?: string | undefined;
  readonly className?: string | undefined;
}

export function StatList({ items, tone = 'default', label, className }: StatListProps) {
  if (items.length === 0) return null;

  return (
    <dl
      className={[styles.list, styles[tone], className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      {items.map((item) => (
        <Stat key={item.label} item={item} />
      ))}
    </dl>
  );
}

function Stat({ item }: { readonly item: StatItem }) {
  const value = useCountUp(item.value);

  return (
    <div className={styles.item}>
      <dt className={styles.value}>
        {formatNumber(value)}
        {item.suffix}
      </dt>
      <dd className={styles.label}>{item.label}</dd>
    </div>
  );
}
