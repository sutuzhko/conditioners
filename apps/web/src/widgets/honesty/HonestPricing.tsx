import { Badge, Card } from '@/shared/ui';

import { honestPoints, honestyContent, rivalPoints } from './content';
import { CheckIcon, CrossIcon } from './icons';
import type { HonestyPoint } from './model';
import styles from './HonestPricing.module.css';

export type HonestPricingProps = {
  /**
   * Минимальная цена монтажа из прайса, ₽ — та же, что в таблице цен.
   *
   * 🔴 Блок в базу не ходит: цену приносит страница
   * (docs/ORCHESTRATION.md). Не передана — заголовок формулируется без
   * цифры, а плашка с ценой не рисуется вовсе. Умолчания нет: «6 000 ₽» из
   * макета — реальная цена из прайса, и в разметке ей не место (инвариант 8).
   */
  readonly installFrom?: number | null | undefined;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  readonly id?: string | undefined;
};

const HEADING_ID = 'honesty-price-title';

/**
 * «Почему монтаж стоит столько» — разбор двух смет рядом.
 *
 * Серверный компонент: это ядро позиционирования и индексируемый текст, он
 * обязан приходить готовым HTML и читаться без JavaScript (инвариант 1).
 * Интерактивности здесь нет вовсе, поэтому нет и `'use client'`.
 */
export function HonestPricing({ installFrom, id = 'chestno' }: HonestPricingProps) {
  // цена приводится к числу или к null один раз: дальше решают её наличие,
  // а не форма пропа — страница может передать и null, и undefined
  const price =
    typeof installFrom === 'number' && Number.isFinite(installFrom) ? installFrom : null;

  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.head}>
          <p className={styles.kicker}>{honestyContent.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {price === null
              ? honestyContent.titleWithoutPrice
              : honestyContent.titleWithPrice(price)}
          </h2>
          <p className={styles.lead}>{honestyContent.lead}</p>
        </header>

        <div className={styles.pair}>
          <Card padding="lg" className={`${styles.card} ${styles.honest}`}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>{honestyContent.honestTitle}</h3>
              {price === null ? null : (
                <Badge variant="accent" className={styles.price}>
                  {honestyContent.honestPrice(price)}
                </Badge>
              )}
            </div>
            <PointList points={honestPoints} label={honestyContent.honestListLabel} tone="honest" />
          </Card>

          <Card padding="lg" className={styles.card}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>{honestyContent.rivalTitle}</h3>
              <Badge variant="neutral" className={styles.price}>
                {honestyContent.rivalBadge}
              </Badge>
            </div>
            <PointList points={rivalPoints} label={honestyContent.rivalListLabel} tone="rival" />
          </Card>
        </div>

        <Card variant="accent" padding="md" className={styles.note}>
          <p className={styles.noteText}>
            {honestyContent.note} <strong>{honestyContent.noteAccent}</strong>
          </p>
        </Card>
      </div>
    </section>
  );
}

type PointListProps = {
  readonly points: readonly HonestyPoint[];
  readonly label: string;
  readonly tone: 'honest' | 'rival';
};

/**
 * Список пунктов сметы. `ul` с подписью: голосом список объявляется тем же,
 * чем глазами его делает галочка или крестик — иначе колонки неразличимы.
 */
function PointList({ points, label, tone }: PointListProps) {
  const Icon = tone === 'honest' ? CheckIcon : CrossIcon;

  return (
    <ul className={`${styles.points} ${styles[tone]}`} aria-label={label}>
      {points.map((point) => (
        <li key={point.id} className={styles.point}>
          <span className={styles.icon}>
            <Icon />
          </span>
          <span className={styles.pointText}>{point.text}</span>
        </li>
      ))}
    </ul>
  );
}
