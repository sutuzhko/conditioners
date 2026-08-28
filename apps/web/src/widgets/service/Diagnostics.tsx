import type { ReactNode } from 'react';

import { leadHref } from '@/shared/config/lead';
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
  /**
   * Панель напоминания о сезонном ТО — слот под формой из макета. Слотом, а
   * не импортом: форма это отдельная точка сбора заявки, и что стоит под
   * диагностикой, решает страница.
   */
  reminder?: ReactNode | undefined;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
}

const HEADING_ID = 'diagnostics-title';

/**
 * Блок «Сервис»: диагностика по симптомам.
 *
 * Серверный компонент — заголовок, подводка и все шесть разборов приходят
 * в HTML готовыми (инвариант 1). Интерактивен только выбор симптома.
 *
 * 🔴 «Вызвать мастера» приносит к форме свою тему (ADR-129): сюда приходит
 * человек с уже стоящим кондиционером, и монтаж ему не нужен. Модели у кнопки
 * нет — симптом это не товар, и подставлять её было бы не с чего.
 */
export function Diagnostics({
  symptoms = defaultSymptoms,
  defaultSymptom,
  reminder,
  id = 'service',
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
            <ButtonLink href={leadHref({ topic: 'service' })} className={styles.cta}>
              {t.cta}
            </ButtonLink>
          </Card>
        ) : (
          <Card padding="xl" radius="xl" elevation="none" className={styles.board}>
            {/* Кнопка стоит внутри ряда разбора, как в макете: причина, работа,
                цена и действие — одна строка, а не разбор и отдельный подвал. */}
            <DiagnosticsPicker
              symptoms={symptoms}
              defaultSymptom={defaultSymptom}
              action={
                <ButtonLink href={leadHref({ topic: 'service' })} className={styles.cta}>
                  {t.cta}
                </ButtonLink>
              }
            />
          </Card>
        )}

        {reminder === undefined ? null : (
          /* Тёмная панель под разбором — вторая точка сбора заявки из макета:
             человек, у которого кондиционер уже стоит, приходит сюда не за
             монтажом, а за обслуживанием. */
          <div className={styles.reminder} data-ground="panel">
            <span className={styles.reminderGlow} aria-hidden="true" />
            <div className={styles.reminderCopy}>
              <h3 className={styles.reminderTitle}>{t.reminderTitle}</h3>
              <p className={styles.reminderText}>{t.reminderText}</p>
            </div>
            <div className={styles.reminderForm}>{reminder}</div>
          </div>
        )}
      </div>
    </section>
  );
}
