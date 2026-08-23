import { Accordion } from '@/shared/ui';

import { buildFaqItems, faqContent as t } from './content';
import type { FaqFacts } from './model';
import styles from './Faq.module.css';

const HEADING_ID = 'faq-title';

export interface FaqProps extends FaqFacts {
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
}

/**
 * Частые вопросы.
 *
 * Секция серверная: вопросы и ответы приходят в HTML готовыми (инвариант 1).
 * `'use client'` стоит только на самом аккордеоне — интерактивен он.
 *
 * 🔴 Ответ остаётся в DOM и свёрнутым: FAQ участвует в разметке `FAQPage`
 * (docs/SEO.md §4), а ответа, которого нет в HTML, поисковик не увидит.
 * Сворачивание в `Accordion` чисто визуальное — сеткой `0fr → 1fr`, без
 * размонтирования панели. Стили секции этого не меняют.
 */
export function Faq({ installFrom, installTerm, warranty, id = 'faq' }: FaqProps) {
  const items = buildFaqItems({ installFrom, installTerm, warranty }).map((entry) => ({
    id: entry.id,
    title: entry.question,
    content: <p className={styles.answer}>{entry.answer}</p>,
  }));

  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.head}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {t.title}
          </h2>
        </header>

        <Accordion items={items} mode="single" headingLevel={3} className={styles.list} />
      </div>
    </section>
  );
}
