import type { ReactNode } from 'react';

import { trustStripContent as t } from './content';
import { GridIcon, PulseIcon, ShieldIcon, ClockIcon } from './icons';
import type { TrustClaimKey } from './content';
import styles from './TrustStrip.module.css';

/** Иконка своя у каждого утверждения — разметку задаёт код, текст контент. */
const icons: Record<TrustClaimKey, ReactNode> = {
  contract: <ShieldIcon />,
  turnkey: <ClockIcon />,
  vacuum: <PulseIcon />,
  brands: <GridIcon />,
};

/**
 * Полоса доверия — тёмная врезка под первым экраном.
 *
 * Серверный компонент без единого пропса: здесь только описание услуги.
 * 🔴 Ни одного факта о компании и ни одной цифры — «монтаж за 3–4 часа» из
 * макета не перенесён сознательно (инвариант 8).
 */
export function TrustStrip() {
  return (
    <section className={styles.strip}>
      <ul className={styles.list} aria-label={t.label}>
        {t.items.map((item) => (
          <li key={item.key} className={styles.item}>
            <span className={styles.icon}>{icons[item.key]}</span>
            {item.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
