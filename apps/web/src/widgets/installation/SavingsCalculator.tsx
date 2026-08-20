'use client';

import { useState } from 'react';

import { formatMoney } from '@/shared/lib/format';
import { Badge, Card, RangeSlider } from '@/shared/ui';

import { savingsContent as t } from './content';
import { SAVINGS_MODEL, estimateSavings } from './lib';
import { HOURS_DEFAULT, HOURS_MAX, HOURS_MIN, TARIFF_MAX, TARIFF_MIN, TARIFF_STEP } from './model';
import styles from './SavingsCalculator.module.css';

export type SavingsCalculatorProps = {
  /** Стартовый тариф на ползунке, ₽/кВт·ч. */
  readonly defaultTariff: number;
};

/** Ширина полоски в процентах — из той же доли, что и цифры рядом. */
function barWidth(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Ползунки и результат расчёта экономии.
 *
 * `'use client'` стоит на этом листе, а не на секции: заголовок, лид и
 * оговорка про приблизительность рендерит сервер (инвариант 1). Арифметика —
 * в чистой `estimateSavings`, компонент только рисует её результат.
 */
export function SavingsCalculator({ defaultTariff }: SavingsCalculatorProps) {
  const [hours, setHours] = useState(HOURS_DEFAULT);
  const [tariff, setTariff] = useState(defaultTariff);

  const estimate = estimateSavings({ hoursPerDay: hours, tariff });

  return (
    <div className={styles.grid}>
      <Card padding="lg" className={styles.inputs}>
        <RangeSlider
          label={t.hoursLabel}
          value={hours}
          onChange={setHours}
          min={HOURS_MIN}
          max={HOURS_MAX}
          formatValue={t.hours}
        />
        <RangeSlider
          label={t.tariffLabel}
          value={tariff}
          onChange={setTariff}
          min={TARIFF_MIN}
          max={TARIFF_MAX}
          step={TARIFF_STEP}
          formatValue={t.tariff}
        />
        <p className={styles.basis}>{t.basis}</p>
      </Card>

      <Card padding="lg" className={styles.result}>
        <div className={styles.resultHead}>
          <h3 className={styles.resultTitle}>{t.resultTitle}</h3>
          {/* метка «оценка» стоит вплотную к цифрам: цифры оценочные,
              и человек должен видеть это раньше, чем сумму */}
          <Badge size="sm" mono>
            {t.estimateBadge}
          </Badge>
        </div>

        <div className={styles.row}>
          <p className={styles.rowHead}>
            <span className={styles.rowLabel}>{t.usual}</span>
            <span className={styles.rowValue}>{t.perSeason(formatMoney(estimate.usual))}</span>
          </p>
          <span className={styles.bar} aria-hidden="true">
            <span className={`${styles.fill} ${styles.fillUsual}`} />
          </span>
        </div>

        <div className={styles.row}>
          <p className={styles.rowHead}>
            <span className={styles.rowLabel}>{t.inverter}</span>
            <span className={styles.rowValue}>{t.perSeason(formatMoney(estimate.inverter))}</span>
          </p>
          <span className={styles.bar} aria-hidden="true">
            <span
              className={`${styles.fill} ${styles.fillInverter}`}
              style={{ width: barWidth(estimate.inverterShare) }}
            />
          </span>
        </div>

        <p className={styles.total}>
          <span className={styles.totalLabel}>{t.saving}</span>
          <span className={styles.totalValue}>{t.perSeason(formatMoney(estimate.saved))}</span>
          <span className={styles.totalHorizon}>
            {t.perHorizon(formatMoney(estimate.savedOverHorizon), SAVINGS_MODEL.horizonYears)}
          </span>
        </p>
      </Card>
    </div>
  );
}
