'use client';

import { useId, useState } from 'react';

import { formatMoney } from '@/shared/lib/format';
import { Button, Card, RangeSlider } from '@/shared/ui';

import { HoursGrid } from './HoursGrid';
import { savingsContent as t } from './content';
import { SAVINGS_MODEL, estimateSavings } from './lib';
import {
  HOURS_IN_DAY,
  TARIFF_DAY_MAX,
  TARIFF_DAY_MIN,
  TARIFF_NIGHT_MAX,
  TARIFF_NIGHT_MIN,
  TARIFF_STEP,
  type TariffMode,
} from './model';
import styles from './SavingsCalculator.module.css';

export type SavingsCalculatorProps = {
  /** Часы, отмеченные при первом показе: список часов суток, 0…23. */
  readonly defaultHours: readonly number[];
  /** Режим тарифа при первом показе. */
  readonly defaultMode: TariffMode;
  /** Стартовые ставки на ползунках, ₽/кВт·ч. */
  readonly defaultTariffDay: number;
  readonly defaultTariffNight: number;
};

/** Список часов превращается в отметки по суткам; чужие числа отбрасываются. */
function toHourFlags(hours: readonly number[]): boolean[] {
  const flags = Array.from({ length: HOURS_IN_DAY }, () => false);
  for (const hour of hours) {
    if (Number.isInteger(hour) && hour >= 0 && hour < HOURS_IN_DAY) flags[hour] = true;
  }
  return flags;
}

/** Ширина полоски — из той же доли, что и цифры рядом. */
function barWidth(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Сетка часов, тариф и результат расчёта экономии.
 *
 * `'use client'` стоит на этом листе, а не на секции: заголовок, лид и
 * оговорка про приблизительность рендерит сервер (инвариант 1). Арифметика —
 * в чистой `estimateSavings`, компонент только рисует её результат.
 */
export function SavingsCalculator({
  defaultHours,
  defaultMode,
  defaultTariffDay,
  defaultTariffNight,
}: SavingsCalculatorProps) {
  const [hours, setHours] = useState(() => toHourFlags(defaultHours));
  const [mode, setMode] = useState<TariffMode>(defaultMode);
  const [tariffDay, setTariffDay] = useState(defaultTariffDay);
  const [tariffNight, setTariffNight] = useState(defaultTariffNight);

  const gridLabelId = useId();
  const estimate = estimateSavings({ hours, mode, tariffDay, tariffNight });
  const dual = mode === 'dual';
  const empty = estimate.totalHours === 0;

  const setHour = (hour: number, next: boolean) => {
    setHours((current) => current.map((on, index) => (index === hour ? next : on)));
  };

  return (
    <div className={styles.grid}>
      <Card padding="xl" radius="xl" className={styles.inputs}>
        <div>
          <p className={styles.gridHead}>
            <span id={gridLabelId} className={styles.gridLabel}>
              {t.gridLabel}
            </span>
            {/* сумма объявляется голосом: без этого протяжка мышью и нажатие
                пробелом остаются беззвучными */}
            <output className={styles.gridTotal} aria-live="polite" aria-label={t.gridTotalLabel}>
              {t.hours(estimate.totalHours)}
            </output>
          </p>

          <HoursGrid hours={hours} onChange={setHour} labelId={gridLabelId} />

          <p className="srOnly">{t.gridHint}</p>
        </div>

        <div>
          <p className={styles.tariffHead}>
            <span className={styles.gridLabel}>{t.tariffLabel}</span>
            <span className={styles.modes} role="group" aria-label={t.tariffLabelFull}>
              <Button
                size="sm"
                variant={dual ? 'ghost' : 'primary'}
                aria-pressed={!dual}
                onClick={() => setMode('single')}
              >
                {t.modeSingle}
              </Button>
              <Button
                size="sm"
                variant={dual ? 'primary' : 'ghost'}
                aria-pressed={dual}
                onClick={() => setMode('dual')}
              >
                {t.modeDual}
              </Button>
            </span>
          </p>

          <div className={styles.sliders}>
            <RangeSlider
              label={dual ? t.tariffDayDual : t.tariffDaySingle}
              value={tariffDay}
              onChange={setTariffDay}
              min={TARIFF_DAY_MIN}
              max={TARIFF_DAY_MAX}
              step={TARIFF_STEP}
              formatValue={t.tariff}
              showScale={false}
              size="sm"
            />
            {/* В едином тарифе ночная ставка не участвует в расчёте. В макете
                ползунок просто пригашен; `disabled` добавляет к этому то, чего
                глазами не видно, — состояние доходит и до скринридера. */}
            <RangeSlider
              label={t.tariffNight}
              value={tariffNight}
              onChange={setTariffNight}
              min={TARIFF_NIGHT_MIN}
              max={TARIFF_NIGHT_MAX}
              step={TARIFF_STEP}
              formatValue={t.tariff}
              showScale={false}
              size="sm"
              disabled={!dual}
              className={dual ? undefined : styles.tariffOff}
            />
          </div>
        </div>

        {/* допущения названы прямо под управлением, а не только в оговорке */}
      </Card>

      {/* 🔴 Заголовка и плашки «оценка» в макете нет, но оценочность цифр
          обязана быть видна: её держат знак «≈» у каждой суммы, названные
          допущения под управлением и абзац-оговорка под карточками. */}
      <Card padding="xl" radius="xl" className={styles.result}>
        <div className={styles.row}>
          <p className={styles.rowHead}>
            <span className={styles.rowLabel}>{t.usual}</span>
            <span className={styles.rowValue}>{t.perSeason(formatMoney(estimate.usual))}</span>
          </p>
          <span className={styles.bar} aria-hidden="true">
            <span
              className={`${styles.fill} ${styles.fillUsual}`}
              style={{ width: empty ? '0%' : '100%' }}
            />
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
              style={{ width: empty ? '0%' : barWidth(estimate.inverterShare) }}
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

        {empty ? <p className={styles.empty}>{t.empty}</p> : null}
      </Card>
    </div>
  );
}
