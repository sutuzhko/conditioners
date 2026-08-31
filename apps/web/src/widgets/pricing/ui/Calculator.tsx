'use client';

import { useDeferredValue, useState } from 'react';
import { calculateInstallation } from '@/entities/price/lib/calculateInstallation';
import { estimateScope } from '@/entities/price/lib/estimateScope';
import type { InstallRates, PriceRow } from '@/entities/price/model';
import { rememberLeadContext } from '@/features/lead-form';
import { leadHref } from '@/shared/config/lead';
import { formatMoney } from '@/shared/lib/format';
import { Card, Checkbox, RangeSlider, Select } from '@/shared/ui';
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
import { TotalBar, type TotalBarProps, type TotalState } from './TotalBar';
import styles from './Calculator.module.css';

export type CalculatorProps = {
  /** Строки прайса: из них берутся классы мощности и базовая цена. */
  readonly rows: readonly PriceRow[];
  /** Ставки допработ. Ни одного коэффициента внутри компонента нет. */
  readonly rates: InstallRates;
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

/** Всё, что человек выбрал в калькуляторе, — одним значением. */
type CalculatorForm = {
  readonly cls: string;
  readonly trassaM: number;
  readonly floor: number;
  readonly shtroblenie: boolean;
  readonly qty: number;
};

/** Какое состояние показывает полоса итога: пересчёт важнее всего прочего. */
function totalState(stale: boolean, onsite: boolean): TotalState {
  if (stale) return 'pending';
  return onsite ? 'onsite' : 'ready';
}

/**
 * Калькулятор монтажа — единственная интерактивная часть блока, поэтому
 * `'use client'` стоит здесь, а не на секции: таблица цен обязана приходить
 * готовым HTML (инвариант 1).
 *
 * 🔴 Считает домен: `calculateInstallation` по формуле из PROJECT §2.4, а
 * границу честного расчёта проводит `estimateScope`. Своей арифметики здесь
 * нет, зашитых цифр — тоже: включённые метры трассы и порог высотных работ
 * приходят в ставках (ADR-029), пределы шкал — пропсами.
 */
export function Calculator({
  rows,
  rates,
  onApply,
  trassaMaxM,
  qtyMax,
  defaults,
}: CalculatorProps) {
  const ordered = sortedRows(rows);
  const first = ordered[0];
  const floors = floorOptions(rates.heightFloorFrom);
  const trassa = trassaRange(rates, trassaMaxM);

  const [form, setForm] = useState<CalculatorForm>(() => ({
    cls: defaults?.cls ?? (first === undefined ? '' : first.cls),
    trassaM: clamp(defaults?.trassaM ?? trassa.min, trassa.min, trassa.max),
    floor: normalizeFloor(defaults?.floor ?? 1, rates.heightFloorFrom),
    shtroblenie: defaults?.shtroblenie ?? false,
    qty: clamp(defaults?.qty ?? 1, 1, Math.max(1, qtyMax)),
  }));

  /* 🔴 Смета отстаёт от полей намеренно. Пересчёт с перерисовкой всей карточки
     на каждое движение ползунка съедает кадры на телефоне — а ползунок тянут
     пальцем именно там. React отдаёт полям срочный кадр, смету пересчитывает
     следом, и пока она отстаёт, полоса итога честно говорит «пересчитываем»
     вместо того, чтобы показывать сумму от прошлого положения ползунка. */
  const shown = useDeferredValue(form);
  const stale = shown !== form;

  const patch = (next: Partial<CalculatorForm>): void => {
    setForm((current) => ({ ...current, ...next }));
  };

  // класс мог исчезнуть из прайса между рендерами — тогда считаем по первому,
  // но никогда не по нулю: выдуманная цена хуже отсутствующей
  const row = ordered.find((item) => item.cls === shown.cls) ?? first;
  if (row === undefined) return null;

  const input = {
    basePrice: row.price,
    trassaM: shown.trassaM,
    floor: shown.floor,
    shtroblenie: shown.shtroblenie,
    qty: shown.qty,
  };
  const estimate = calculateInstallation(input, rates);
  const scope = estimateScope(input, { trassaMaxM, qtyMax });
  const context = { cls: row.cls, area: row.area, input, estimate, rates };
  const handoff: EstimateHandoff = { ...context, text: buildEstimateText(context) };

  const state: TotalState = totalState(stale, scope === 'site-visit');

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

  const barProps = {
    href: leadHref({ topic: 'install' }),
    onApply: apply,
  };
  const totalProps: TotalBarProps =
    state === 'ready' ? { ...barProps, state, amount: estimate.total } : { ...barProps, state };

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
              value={form.cls}
              onChange={(event) => patch({ cls: event.target.value })}
              wrapperClassName={styles.field}
            />

            <RangeSlider
              label={pricingText.fieldTrassa}
              value={form.trassaM}
              onChange={(value) => patch({ trassaM: value })}
              min={trassa.min}
              max={trassa.max}
              formatValue={meters}
              className={styles.field}
            />

            <Select
              label={pricingText.fieldFloor}
              options={floors}
              value={String(form.floor)}
              onChange={(event) => patch({ floor: Number(event.target.value) })}
              hint={rates.heightWorks > 0 ? floorHint(rates.heightFloorFrom) : undefined}
              wrapperClassName={styles.field}
            />

            <Select
              label={pricingText.fieldQty}
              options={qtyOptions(qtyMax)}
              value={String(form.qty)}
              onChange={(event) => patch({ qty: Number(event.target.value) })}
              wrapperClassName={styles.field}
            />
          </div>

          {rates.shtrobPerM > 0 ? (
            <Checkbox
              label={shtrobLabel(rates.shtrobPerM)}
              checked={form.shtroblenie}
              onChange={(event) => patch({ shtroblenie: event.target.checked })}
              wrapperClassName={styles.shtrob}
            />
          ) : null}
        </div>

        <div className={styles.summary}>
          <div className={styles.breakdown}>
            <p className={styles.breakdownTitle}>{pricingText.breakdownTitle}</p>
            {/* 🔴 За границей формулы разбивка не показывается вовсе: слагаемые
                с цифрами рядом с «считаем на выезде» читались бы обещанием
                суммы, которого мы не давали. */}
            {scope === 'site-visit' ? (
              <p className={styles.onSiteText}>{pricingText.onSiteText}</p>
            ) : (
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
            )}
          </div>

          {/* Причал держит липкость и вылет за поля сметы, полоса — свою
              строку значения и кнопку: одно свойство не делится на два модуля. */}
          <div className={styles.totalDock}>
            <TotalBar {...totalProps} />
          </div>
        </div>
      </div>
    </Card>
  );
}
