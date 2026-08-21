import type { InstallRates, PriceRow } from '@/entities/price/model';
import type { ButtonLinkHref } from '@/shared/ui';
import { Card } from '@/shared/ui';
import { pricingText, ratesNote } from './content';
import type { CalculatorDefaults, EstimateHandoff } from './model';
import { QTY_MAX, TRASSA_MAX_M } from './model';
import { Calculator } from './ui/Calculator';
import { PriceTable } from './ui/PriceTable';
import styles from './Pricing.module.css';

export interface PricingProps {
  /**
   * Прайс на монтаж по классам мощности. 🔴 Блок в базу не ходит: строки
   * приносит страница (docs/ORCHESTRATION.md, «Блок не ходит в базу»).
   */
  prices: readonly PriceRow[];
  /**
   * Ставки допработ. `null` — ставки не заданы: таблица остаётся, калькулятор
   * не показывается. Считать смету по выдуманным коэффициентам нельзя.
   */
  rates?: InstallRates | null | undefined;
  /** Якорь формы заявки, куда ведёт кнопка расчёта. */
  leadHref?: ButtonLinkHref | undefined;
  /**
   * Готовый расчёт наружу — форму заполняет её владелец, блок только отдаёт
   * текст сметы и параметры, по которым она получилась.
   */
  onApplyEstimate?: ((handoff: EstimateHandoff) => void) | undefined;
  /** Предел ползунка длины трассы: граница интерфейса, а не условие сметы. */
  trassaMaxM?: number | undefined;
  /** Сколько блоков можно посчитать разом. */
  qtyMax?: number | undefined;
  /** С каких значений открыть калькулятор: класс из каталога, длинная трасса. */
  calcDefaults?: CalculatorDefaults | undefined;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
}

const HEADING_ID = 'pricing-title';

/**
 * Блок «Цены на монтаж»: таблица по классам мощности и калькулятор сметы.
 *
 * Серверный компонент. `'use client'` стоит только на калькуляторе — цены
 * приходят в HTML готовыми (инвариант 1).
 */
export function Pricing({
  prices,
  rates,
  leadHref = '#lead',
  onApplyEstimate,
  trassaMaxM = TRASSA_MAX_M,
  qtyMax = QTY_MAX,
  calcDefaults,
  id = 'prices',
}: PricingProps) {
  const hasPrices = prices.length > 0;
  const note = rates ? ratesNote(rates) : [];

  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.head}>
          <p className={styles.kicker}>{pricingText.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {pricingText.title}
          </h2>
          <p className={styles.lead}>{pricingText.lead}</p>
        </header>

        {hasPrices ? (
          <>
            <PriceTable rows={prices} />
            {rates ? (
              <p className={styles.note}>
                {note.length > 0 ? `${note.join(' · ')}. ` : ''}
                {pricingText.ratesNoteTail}
              </p>
            ) : null}
          </>
        ) : (
          <Card variant="soft" padding="lg" className={styles.empty}>
            <p className={styles.emptyTitle}>{pricingText.emptyTitle}</p>
            <p className={styles.emptyText}>{pricingText.emptyText}</p>
          </Card>
        )}

        {hasPrices && rates ? (
          <div className={styles.calc}>
            <Calculator
              rows={prices}
              rates={rates}
              leadHref={leadHref}
              onApply={onApplyEstimate}
              trassaMaxM={trassaMaxM}
              qtyMax={qtyMax}
              defaults={calcDefaults}
            />
          </div>
        ) : null}

        {hasPrices && !rates ? (
          <Card variant="soft" padding="lg" className={styles.calcOff}>
            <p className={styles.emptyTitle}>{pricingText.calcOffTitle}</p>
            <p className={styles.emptyText}>{pricingText.calcOffText}</p>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
