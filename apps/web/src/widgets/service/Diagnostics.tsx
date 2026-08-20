import type { ButtonLinkHref } from '@/shared/ui';
import { ButtonLink, Card } from '@/shared/ui';

import { defaultSymptoms, diagnosticsText as t } from './content';
import { DiagnosticsPicker } from './DiagnosticsPicker';
import type { Symptom } from './model';
import styles from './Diagnostics.module.css';

export interface DiagnosticsProps {
  /**
   * Разборы симптомов. Не переданы — берутся тексты блока из `content.ts`,
   * они описывают технику и не зависят от компании.
   *
   * 🔴 Стоимость работ в `content.ts` не хранится (инвариант 8). Прайс сервиса
   * приезжает сюда: страница берёт его из настроек и передаёт вниз, блок в базу
   * не ходит (docs/ORCHESTRATION.md).
   */
  symptoms?: readonly Symptom[] | undefined;
  /** С какого симптома открыть блок: ссылка из статьи ведёт на нужный разбор. */
  defaultSymptom?: string | undefined;
  /** Куда ведёт «Вызвать мастера» — якорь формы заявки. */
  leadHref?: ButtonLinkHref | undefined;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
}

const HEADING_ID = 'diagnostics-title';

/**
 * Блок «Сервис»: диагностика по симптомам.
 *
 * Серверный компонент — заголовок, подводка и все шесть разборов приходят
 * в HTML готовыми (инвариант 1). Интерактивен только выбор симптома.
 */
export function Diagnostics({
  symptoms = defaultSymptoms,
  defaultSymptom,
  leadHref = '#zayavka',
  id = 'diagnostika',
}: DiagnosticsProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.head}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {t.title}
          </h2>
          <p className={styles.lead}>{t.lead}</p>
        </header>

        {symptoms.length === 0 ? (
          <Card variant="soft" padding="lg" className={styles.empty}>
            <p className={styles.emptyTitle}>{t.emptyTitle}</p>
            <p className={styles.emptyText}>{t.emptyText}</p>
            <ButtonLink href={leadHref} className={styles.cta}>
              {t.cta}
            </ButtonLink>
          </Card>
        ) : (
          <Card padding="lg" className={styles.board}>
            <DiagnosticsPicker symptoms={symptoms} defaultSymptom={defaultSymptom} />

            <div className={styles.footer}>
              <p className={styles.note}>{t.ctaNote}</p>
              <ButtonLink href={leadHref} className={styles.cta}>
                {t.cta}
              </ButtonLink>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
