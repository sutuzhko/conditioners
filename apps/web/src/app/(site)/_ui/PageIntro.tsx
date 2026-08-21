import { ButtonLink, type ButtonLinkHref } from '@/shared/ui';

import styles from './PageIntro.module.css';

/**
 * Вводная часть страницы кластера: единственный `<h1>` и собственный текст
 * страницы (инвариант 4, docs/SEO.md §7).
 *
 * 🔴 Это не блок лендинга, а обвязка страницы: тексты приходят из `content.ts`
 * своего маршрута, цифры — из данных. Ни одного факта о компании внутри
 * (инвариант 8).
 *
 * Заголовок здесь один на всю страницу: вставленные ниже виджеты начинают со
 * своих `h2`, поэтому иерархия не рвётся.
 */

/** Короткий ответ на вопрос «сколько это стоит и сколько ждать» — из данных. */
export type PageIntroFact = {
  readonly label: string;
  readonly value: string;
};

export interface PageIntroProps {
  /** Надзаголовок в стиле секций лендинга. */
  readonly kicker?: string | undefined;
  readonly title: string;
  readonly lead: string;
  /** Основной текст страницы: абзацы идут подряд, разметки внутри нет. */
  readonly paragraphs?: readonly string[] | undefined;
  /** Цифры «до первой прокрутки». Нет данных — нет и строки. */
  readonly facts?: readonly PageIntroFact[] | undefined;
  /** Подпись списка цифр для скринридера. */
  readonly factsLabel?: string | undefined;
  readonly ctaHref?: ButtonLinkHref | undefined;
  readonly ctaLabel?: string | undefined;
}

export function PageIntro({
  kicker,
  title,
  lead,
  paragraphs = [],
  facts = [],
  factsLabel,
  ctaHref,
  ctaLabel,
}: PageIntroProps) {
  const showCta = ctaHref !== undefined && ctaLabel !== undefined;

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <header className={styles.head}>
          {kicker === undefined ? null : <p className={styles.kicker}>{kicker}</p>}
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lead}>{lead}</p>
        </header>

        {paragraphs.length === 0 ? null : (
          <div className={styles.text}>
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {facts.length === 0 ? null : (
          <dl className={styles.facts} aria-label={factsLabel}>
            {facts.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <dt className={styles.factLabel}>{fact.label}</dt>
                <dd className={styles.factValue}>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {showCta ? (
          <p className={styles.actions}>
            <ButtonLink href={ctaHref} size="lg">
              {ctaLabel}
            </ButtonLink>
          </p>
        ) : null}
      </div>
    </section>
  );
}
