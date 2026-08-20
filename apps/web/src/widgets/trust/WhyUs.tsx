import type { Warranty } from '@/entities/settings/model';
import { StatList } from '@/shared/ui';

import { whyUsContent as t } from './content';
import { warrantyTerms } from './lib';
import type { Achievement } from './model';
import styles from './WhyUs.module.css';

export interface WhyUsProps {
  /**
   * Цифры-достижения для счётчиков: «1200+ установок в Туле».
   *
   * 🔴 Значения по умолчанию нет и быть не может — не передали, полосы нет
   * (инварианты 8 и 10). Приходят из настроек компании через страницу.
   */
  achievements?: readonly Achievement[] | undefined;
  /**
   * Сроки гарантии из настроек. Пустые — карточки гарантии в блоке нет:
   * «3 года на монтаж» это факт о компании, а не текст вёрстки.
   */
  warranty?: Warranty | undefined;
  /** Якорь секции: по нему на неё ведёт навигация. */
  id?: string | undefined;
}

const HEADING_ID = 'why-us-title';

/**
 * «Почему в Туле выбирают нас» — тёмная панель с причинами и счётчиками.
 *
 * Серверный компонент: заголовок и причины приходят в HTML готовыми
 * (инвариант 1), `'use client'` стоит только на счётчиках.
 */
export function WhyUs({ achievements = [], warranty, id }: WhyUsProps) {
  const terms = warrantyTerms(warranty);

  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <div className={styles.panel}>
          <span className={styles.glow} aria-hidden="true" />

          <div className={styles.inner}>
            <h2 id={HEADING_ID} className={styles.title}>
              {t.title}
            </h2>

            <StatList
              items={achievements}
              tone="onPanel"
              label={t.achievementsLabel}
              className={styles.achievements}
            />

            <ul className={styles.reasons}>
              {t.reasons.map((reason) => (
                <li key={reason.key} className={styles.reason}>
                  <h3 className={styles.reasonTitle}>{reason.title}</h3>
                  <p className={styles.reasonText}>{reason.text}</p>
                </li>
              ))}

              {terms.length === 0 ? null : (
                <li className={styles.reason}>
                  <h3 className={styles.reasonTitle}>{t.warranty.title}</h3>
                  <dl className={styles.terms}>
                    {terms.map((term) => (
                      <div key={term.label} className={styles.term}>
                        <dt className={styles.termLabel}>{term.label}</dt>
                        <dd className={styles.termValue}>{term.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className={styles.reasonText}>{t.warranty.lead}</p>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
