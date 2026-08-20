import type { Warranty } from '@/entities/settings/model';
import { Card } from '@/shared/ui';

import { installDay, installSteps, stepsContent, timelineContent } from './content';
import { warrantyTerms } from './warranty';
import styles from './StepsTimeline.module.css';

export type StepsTimelineProps = {
  /**
   * Сроки гарантии из настроек компании (группа `warranty`). 🔴 Блок в базу
   * не ходит: значения приносит страница. Не переданы или пусты — строки
   * гарантии в шаге нет вовсе. Умолчания не существует: «до 3 лет» из макета
   * это факт о компании, владелец меняет его из админки (инвариант 8).
   */
  readonly warranty?: Warranty | undefined;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  readonly id?: string | undefined;
};

const HEADING_ID = 'installation-steps-title';
const TIMELINE_HEADING_ID = 'installation-day-title';

/**
 * «Четыре шага до прохлады» и таймлайн дня монтажа.
 *
 * Серверный компонент: шаги и таймлайн — статический текст, они обязаны
 * приходить готовым HTML и читаться без JavaScript (инвариант 1).
 * Интерактивности здесь нет вовсе, поэтому нет и `'use client'`.
 */
export function StepsTimeline({ warranty, id = 'etapy' }: StepsTimelineProps) {
  const lastIndex = installSteps.length - 1;
  const terms = warrantyTerms(warranty);

  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.intro}>
          <p className={styles.kicker}>{stepsContent.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {stepsContent.title}
          </h2>
          <p className={styles.lead}>{stepsContent.lead}</p>
        </header>

        {/* ol, а не набор div: порядок шагов — часть смысла, и он должен
            дойти до скринридера, а не только до глаза */}
        <ol className={styles.steps}>
          {installSteps.map((step, index) => (
            <li key={step.num} className={styles.step}>
              <p className={styles.stepHead}>
                {/* номер дублирует нумерацию списка — глазам нужен, голосу нет */}
                <span className={styles.stepNum} aria-hidden="true">
                  {step.num}
                </span>
                <span className={styles.stepRule} aria-hidden="true" />
              </p>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.text}</p>
              {index === lastIndex && terms.length > 0 ? (
                <dl className={styles.terms} aria-label={stepsContent.warranty.title}>
                  {terms.map((term) => (
                    <div key={term.label} className={styles.term}>
                      <dt className={styles.termLabel}>{term.label}</dt>
                      <dd className={styles.termValue}>{term.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          ))}
        </ol>

        <Card
          as="section"
          variant="panel"
          padding="none"
          className={styles.timeline}
          aria-labelledby={TIMELINE_HEADING_ID}
        >
          <span className={styles.glow} aria-hidden="true" />
          <div className={styles.timelineInner}>
            <header className={styles.timelineHead}>
              <div className={styles.timelineHeading}>
                <p className={styles.timelineKicker}>{timelineContent.kicker}</p>
                <h3 id={TIMELINE_HEADING_ID} className={styles.timelineTitle}>
                  {timelineContent.title}
                </h3>
              </div>
              <p className={styles.timelineNote}>{timelineContent.note}</p>
            </header>

            <ol className={styles.day}>
              {installDay.map((entry) => (
                <li key={entry.time} className={styles.dayItem}>
                  <p className={styles.dayHead}>
                    <time className={styles.dayTime} dateTime={entry.time}>
                      {entry.time}
                    </time>
                    <span className={styles.dayRule} aria-hidden="true" />
                  </p>
                  <h4 className={styles.dayTitle}>{entry.title}</h4>
                  <p className={styles.dayText}>{entry.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      </div>
    </section>
  );
}
