import type { ReactNode } from 'react';

import { ClockIcon, ShieldIcon } from '@/shared/ui';

import { trustStripContent as t } from './content';
import { GridIcon, PulseIcon } from './icons';
import type { TrustClaimKey } from './content';
import styles from './TrustStrip.module.css';

/** Иконка своя у каждого утверждения — разметку задаёт код, текст контент. */
const icons: Record<TrustClaimKey, ReactNode> = {
  contract: <ShieldIcon />,
  turnkey: <ClockIcon />,
  vacuum: <PulseIcon />,
  brands: <GridIcon />,
};

function claims(): ReactNode {
  return t.items.map((item) => (
    <li key={item.key} className={styles.item}>
      <span className={styles.icon}>{icons[item.key]}</span>
      {item.text}
    </li>
  ));
}

/**
 * Полоса доверия — тёмная врезка под первым экраном.
 *
 * Серверный компонент без единого пропса: здесь только описание услуги.
 * 🔴 Ни одного факта о компании и ни одной цифры — «монтаж за 3–4 часа» из
 * макета не перенесён сознательно (инвариант 8).
 *
 * Ряд не переносится: полоса стоит внутри первого экрана (ADR-047), и
 * вторая строка ломала бы его высоту. На узких ширинах ряд едет лентой,
 * поэтому список продублирован — иначе бегущая строка идёт с разрывом.
 * Копия скрыта от скринридера: она повторяет уже прочитанное.
 */
export function TrustStrip() {
  return (
    <section className={styles.strip}>
      <div className={styles.viewport}>
        <div className={styles.track}>
          <ul className={styles.list} aria-label={t.label}>
            {claims()}
          </ul>
          <ul className={styles.list} aria-hidden="true">
            {claims()}
          </ul>
        </div>
      </div>
    </section>
  );
}
