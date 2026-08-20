'use client';

import { formatNumber } from '@/shared/lib/format';
import { useCountUp } from '@/shared/lib/useCountUp';

import type { HeroStat } from './model';
import styles from './HeroStats.module.css';

export type HeroStatsProps = {
  readonly stats: readonly HeroStat[];
};

/**
 * Полоса преимуществ с анимацией цифр (DESIGN_BRIEF §7).
 *
 * 🔴 Цифры приходят из настроек компании, а не из кода: «1200 установок» —
 * это факт о компании и одновременно счётчик, который нельзя выдумывать
 * (инварианты 8 и 10). Пустой список — полосы просто нет.
 *
 * Клиентским компонент делает только счётчик: `useCountUp` стартует с
 * конечного значения, поэтому в серверном HTML стоит настоящее число.
 */
export function HeroStats({ stats }: HeroStatsProps) {
  if (stats.length === 0) return null;

  return (
    <dl className={styles.stats}>
      {stats.map((stat) => (
        <Stat key={stat.label} stat={stat} />
      ))}
    </dl>
  );
}

function Stat({ stat }: { readonly stat: HeroStat }) {
  const value = useCountUp(stat.value);

  return (
    <div className={styles.item}>
      <dt className={styles.value}>
        {formatNumber(value)}
        {stat.suffix}
      </dt>
      <dd className={styles.label}>{stat.label}</dd>
    </div>
  );
}
