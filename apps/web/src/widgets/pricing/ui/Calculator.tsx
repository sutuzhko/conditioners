'use client';

import { useId, useState } from 'react';
import { calculateInstallation } from '@/entities/price/lib/calculateInstallation';
import type { InstallRates, PriceRow } from '@/entities/price/model';
import { rememberLeadContext } from '@/features/lead-form';
import { formatMoney } from '@/shared/lib/format';
import type { ButtonLinkHref } from '@/shared/ui';
import { ButtonLink, Card, Checkbox, RangeSlider, Select } from '@/shared/ui';
import { floorHint, lineLabel, meters, pricingText, qtyMultiplier, shtrobLabel } from '../content';
import type { CalculatorDefaults, EstimateHandoff } from '../model';
import {
  buildEstimateText,
  clamp,
  classOptions,
  floorOptions,
  normalizeFloor,
  qtyOptions,
  sortedRows,
  toLeadContextEstimate,
  trassaRange,
} from '../model';
import styles from './Calculator.module.css';

export type CalculatorProps = {
  /** Строки прайса: из них берутся классы мощности и базовая цена. */
  readonly rows: readonly PriceRow[];
  /** Ставки допработ. Ни одного коэффициента внутри компонента нет. */
  readonly rates: InstallRates;
  /**
   * Куда ведёт «Зафиксировать в заявке» — якорь формы. Форма живёт в другой
   * зоне владения, блок только доводит человека до неё.
   */
  readonly leadHref: ButtonLinkHref;
  /**
   * Готовый расчёт наружу. Вызывается в момент перехода к форме.
   *
   * По умолчанию расчёт уходит в хранилище контекста заявки: страница —
   * серверный компонент и колбэк сюда передать не может, а форма стоит
   * секцией ниже и подхватывает снимок сама. Пропс остаётся ради историй и
   * тестов, где переход никуда не ведёт.
   */
  readonly onApply?: ((handoff: EstimateHandoff) => void) | undefined;
  /** Предел ползунка трассы и списка количества — границы интерфейса. */
  readonly trassaMaxM: number;
  readonly qtyMax: number;
  /** С чего начать расчёт. По умолчанию — самый дешёвый случай. */
  readonly defaults?: CalculatorDefaults | undefined;
};

/**
 * Калькулятор монтажа — единственная интерактивная часть блока, поэтому
 * `'use client'` стоит здесь, а не на секции: таблица цен обязана приходить
 * готовым HTML (инвариант 1).
 *
 * 🔴 Считает домен: `calculateInstallation` по формуле из PROJECT §2.4. Своей
 * арифметики здесь нет, зашитых цифр — тоже: включённые метры трассы и порог
 * высотных работ приходят в ставках (ADR-029).
 */
export function Calculator({
  rows,
  rates,
  leadHref,
  onApply,
  trassaMaxM,
  qtyMax,
  defaults,
}: CalculatorProps) {
  const ordered = sortedRows(rows);
  const first = ordered[0];
  const floors = floorOptions(rates.heightFloorFrom);
  const trassa = trassaRange(rates, trassaMaxM);

  const [cls, setCls] = useState(defaults?.cls ?? (first === undefined ? '' : first.cls));
  const [trassaM, setTrassaM] = useState(
    clamp(defaults?.trassaM ?? trassa.min, trassa.min, trassa.max),
  );
  const [floor, setFloor] = useState(normalizeFloor(defaults?.floor ?? 1, rates.heightFloorFrom));
  const [shtroblenie, setShtroblenie] = useState(defaults?.shtroblenie ?? false);
  const [qty, setQty] = useState(clamp(defaults?.qty ?? 1, 1, Math.max(1, qtyMax)));
  // подпись итога связывается с суммой явно: рядом на странице живёт ползунок,
  // и его <output> без этого сливается с итогом в один безымянный «статус»
  const totalLabelId = useId();

  // класс мог исчезнуть из прайса между рендерами — тогда считаем по первому,
  // но никогда не по нулю: выдуманная цена хуже отсутствующей
  const row = ordered.find((item) => item.cls === cls) ?? first;
  if (row === undefined) return null;

  const input = { basePrice: row.price, trassaM, floor, shtroblenie, qty };
  const estimate = calculateInstallation(input, rates);
  const context = { cls: row.cls, area: row.area, input, estimate, rates };
  const handoff: EstimateHandoff = { ...context, text: buildEstimateText(context) };

  /* 🔴 Снимок пишется в момент перехода к форме, а не на каждое движение
     ползунка: в заявку обязана попасть та смета, которую человек решил
     зафиксировать, а не та, мимо которой он проехал. */
  const apply = (): void => {
    if (onApply !== undefined) {
      onApply(handoff);
      return;
    }
    rememberLeadContext({ estimate: toLeadContextEstimate(context) });
  };

  return (
    <Card padding="xl" radius="xl" className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>{pricingText.calcTitle}</h3>
        {/* В макете это подпись моношрифтом, а не плашка: у калькулятора и
            так есть заголовок, вторая пилюля рядом с ним лишняя. */}
        <span className={styles.badge}>{pricingText.calcBadge}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.params}>
          <div className={styles.fields}>
            <Select
              label={pricingText.fieldClass}
              options={classOptions(ordered)}
              value={row.cls}
              onChange={(event) => setCls(event.target.value)}
              wrapperClassName={styles.field}
            />

            <RangeSlider
              label={pricingText.fieldTrassa}
              value={trassaM}
              onChange={setTrassaM}
              min={trassa.min}
              max={trassa.max}
              formatValue={meters}
              className={styles.field}
            />

            <Select
              label={pricingText.fieldFloor}
              options={floors}
              value={String(floor)}
              onChange={(event) => setFloor(Number(event.target.value))}
              hint={rates.heightWorks > 0 ? floorHint(rates.heightFloorFrom) : undefined}
              wrapperClassName={styles.field}
            />

            <Select
              label={pricingText.fieldQty}
              options={qtyOptions(qtyMax)}
              value={String(qty)}
              onChange={(event) => setQty(Number(event.target.value))}
              wrapperClassName={styles.field}
            />
          </div>

          {rates.shtrobPerM > 0 ? (
            <Checkbox
              label={shtrobLabel(rates.shtrobPerM)}
              checked={shtroblenie}
              onChange={(event) => setShtroblenie(event.target.checked)}
              wrapperClassName={styles.shtrob}
            />
          ) : null}
        </div>

        <div className={styles.summary}>
          <div className={styles.breakdown}>
            <p className={styles.breakdownTitle}>{pricingText.breakdownTitle}</p>
            <dl className={styles.lines}>
              {estimate.lines.map((line) => (
                <div key={line.kind} className={styles.line}>
                  <dt className={styles.lineLabel}>
                    {lineLabel(line, { cls: row.cls, heightFloorFrom: rates.heightFloorFrom })}
                  </dt>
                  <dd className={styles.lineAmount}>{formatMoney(line.amount)}</dd>
                </div>
              ))}
              {estimate.qty > 1 ? (
                <div className={styles.line}>
                  <dt className={styles.lineLabel}>
                    {`${pricingText.perUnitLabel} ${qtyMultiplier(estimate.qty)}`}
                  </dt>
                  <dd className={styles.lineAmount}>{formatMoney(estimate.perUnit)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className={styles.total}>
            <div className={styles.totalValue}>
              <span className={styles.totalLabel} id={totalLabelId}>
                {pricingText.totalLabel}
              </span>
              <output className={styles.totalAmount} aria-labelledby={totalLabelId}>
                {formatMoney(estimate.total)}
              </output>
            </div>
            <ButtonLink href={leadHref} size="lg" className={styles.apply} onClick={apply}>
              {pricingText.apply}
            </ButtonLink>
          </div>
        </div>
      </div>
    </Card>
  );
}
