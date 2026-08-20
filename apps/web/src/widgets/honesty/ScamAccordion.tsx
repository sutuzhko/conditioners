import Link from 'next/link';

import type { ButtonLinkHref } from '@/shared/ui';
import { Accordion, Badge } from '@/shared/ui';

import { scamContent, scamSchemes } from './content';
import styles from './ScamAccordion.module.css';

export type ScamAccordionProps = {
  /**
   * Какие схемы раскрыты при загрузке. По умолчанию раскрыта первая — как в
   * макете: свёрнутый целиком список читается как меню, а не как разбор.
   */
  readonly defaultOpen?: readonly string[] | undefined;
  /**
   * Ссылка на полный разбор в Базе знаний. Не передана — строки со ссылкой
   * нет: мёртвая ссылка хуже её отсутствия.
   */
  readonly articleHref?: ButtonLinkHref | undefined;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  readonly id?: string | undefined;
};

const HEADING_ID = 'honesty-scam-title';

/** Раскрытая по умолчанию схема — первая, как в макете. */
const FIRST_SCHEME_OPEN: readonly string[] = scamSchemes.slice(0, 1).map((scheme) => scheme.id);

/**
 * «Как обманывают при установке» — пять схем аккордеоном.
 *
 * Серверный компонент; клиентский только сам `Accordion`. 🔴 Разбор каждой
 * схемы приходит в HTML и остаётся в нём даже свёрнутым — это индексируемый
 * контент и опора всего позиционирования (docs/CLAUDE.md, «Доступность»).
 */
export function ScamAccordion({
  defaultOpen = FIRST_SCHEME_OPEN,
  articleHref,
  id = 'obman',
}: ScamAccordionProps) {
  const items = scamSchemes.map((scheme) => ({
    id: scheme.id,
    title: (
      <span className={styles.itemTitle}>
        <Badge variant="sale" size="sm" mono className={styles.scheme}>
          {scamContent.schemeLabel(scheme.num)}
        </Badge>
        <span className={styles.itemName}>{scheme.title}</span>
      </span>
    ),
    content: (
      <div className={styles.body}>
        <div className={`${styles.part} ${styles.quote}`}>
          <p className={styles.partLabel}>{scamContent.quoteLabel}</p>
          {/* blockquote, а не div: это дословная реплика, и она обязана
              остаться цитатой и для скринридера */}
          <blockquote className={styles.quoteText}>«{scheme.quote}»</blockquote>
        </div>
        <div className={`${styles.part} ${styles.truth}`}>
          <p className={styles.partLabel}>{scamContent.truthLabel}</p>
          <p className={styles.truthText}>{scheme.truth}</p>
        </div>
      </div>
    ),
  }));

  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.head}>
          <p className={styles.kicker}>{scamContent.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {scamContent.title}
          </h2>
          <p className={styles.lead}>{scamContent.lead}</p>
        </header>

        <Accordion items={items} mode="single" defaultOpen={defaultOpen} headingLevel={3} />

        {articleHref === undefined ? null : (
          <p className={styles.article}>
            <span className={styles.articleNote}>{scamContent.articleNote}</span>
            <Link href={articleHref} className={styles.articleLink}>
              {scamContent.articleLink}
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
