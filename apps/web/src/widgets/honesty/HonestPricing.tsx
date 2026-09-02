import { Badge, Card, Icon } from '@/shared/ui';

import { honestPoints, honestyContent, rivalPoints } from './content';
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
 *
 * 🔴 Вторая смета до 900px свёрнута родным `<details>` (issue #271): две
 * карточки по пять пунктов подряд на телефоне — это 760px, и сравнение
 * рассыпается на два экрана. С 900px сметы стоят рядом, и список второй
 * раскрыт стилем через `::details-content` (ADR-121). Заголовок и плашка
 * второй карточки стоят вне раскрывашки: они видны на любой ширине, а
 * переключатель ниже 900 открывает только список — и на широком экране
 * убирается целиком, не унося с собой заголовок.
 */
export function HonestPricing({ installFrom, id = 'honesty' }: HonestPricingProps) {
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
          <Card
            padding="none"
            radius="xl"
            elevation="none"
            className={`${styles.card} ${styles.honest}`}
          >
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

          <Card
            variant="soft"
            padding="none"
            radius="xl"
            elevation="none"
            className={`${styles.card} ${styles.rival}`}
          >
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>{honestyContent.rivalTitle}</h3>
              <Badge variant="neutral" className={styles.price}>
                {honestyContent.rivalBadge}
              </Badge>
            </div>
            <details className={styles.rivalDetails}>
              <summary className={styles.rivalSummary}>
                <span className={styles.rivalSummaryText}>{honestyContent.rivalToggle}</span>
                {/* знак «плюс — минус» рисуется границами: состояние несёт сам
                    `<details>`, знак только повторяет его глазами */}
                <span className={styles.rivalToggle} aria-hidden="true" />
              </summary>
              <PointList points={rivalPoints} label={honestyContent.rivalListLabel} tone="rival" />
            </details>
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
 *
 * 🔴 Крестик, а не знак опасности, и цветом `--faint`, а не красным: красный
 * на витрине допустим только у скидки (DESIGN_BRIEF §10). Разница смет
 * читается контрастом и иконкой, а не цветом тревоги.
 */
function PointList({ points, label, tone }: PointListProps) {
  const name = tone === 'honest' ? 'check' : 'close';
  const toneClass = tone === 'honest' ? styles.pointsHonest : styles.pointsRival;

  return (
    <ul className={`${styles.points} ${toneClass}`} aria-label={label}>
      {points.map((point) => (
        <li key={point.id} className={styles.point}>
          <span className={styles.icon}>
            <Icon name={name} size={18} />
          </span>
          <span className={styles.pointText}>{point.text}</span>
        </li>
      ))}
    </ul>
  );
}
