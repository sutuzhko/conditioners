'use client';

import { formatNumber } from '@/shared/lib/format';
import { useCountUp } from '@/shared/lib/useCountUp';

import { whyUsContent as t } from './content';
import type { Achievement } from './model';
import styles from './WhyUsAchievements.module.css';

export type WhyUsAchievementsProps = {
  readonly achievements: readonly Achievement[];
};

/**
 * Полоса достижений с анимацией цифр (docs/DESIGN_BRIEF.md §7).
 *
 * 🔴 Цифры приходят из настроек компании. Пустой список — полосы нет вовсе:
 * счётчик «выполнено работ» со значением по умолчанию был бы выдуманным
 * фактом (инварианты 8 и 10). Пустая полоса лучше выдуманной.
 *
 * Клиентским компонент делает только счётчик: `useCountUp` стартует с
 * конечного значения, поэтому в серверном HTML стоит настоящее число.
 */
export function WhyUsAchievements({ achievements }: WhyUsAchievementsProps) {
  if (achievements.length === 0) return null;

  return (
    <dl className={styles.list} aria-label={t.achievementsLabel}>
      {achievements.map((achievement) => (
        <Counter key={achievement.label} achievement={achievement} />
      ))}
    </dl>
  );
}

function Counter({ achievement }: { readonly achievement: Achievement }) {
  const value = useCountUp(achievement.value);

  return (
    <div className={styles.item}>
      <dt className={styles.value}>
        {formatNumber(value)}
        {achievement.suffix}
      </dt>
      <dd className={styles.label}>{achievement.label}</dd>
    </div>
  );
}
