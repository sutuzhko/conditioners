'use client';

import { useId, useState } from 'react';

import { formatMoney } from '@/shared/lib/format';
import { Chip } from '@/shared/ui';

import { diagnosticsText as t } from './content';
import type { Symptom } from './model';
import styles from './DiagnosticsPicker.module.css';

export type DiagnosticsPickerProps = {
  /** Разборы симптомов — минимум один, пустой список отсекает секция. */
  readonly symptoms: readonly Symptom[];
  /** С какого симптома открыть блок: ключ из списка. */
  readonly defaultSymptom?: string | undefined;
};

/**
 * Выбор симптома и его разбор.
 *
 * 🔴 Все разборы присутствуют в разметке всегда: неактивные скрыты атрибутом
 * `hidden`, но остаются в HTML — это индексируемый контент под запросы вида
 * «кондиционер не холодит» (docs/CLAUDE.md, «Доступность»). Подгрузка по клику
 * стоила бы этих запросов целиком.
 *
 * `'use client'` стоит на этом листе, а не на секции: заголовок и подводка
 * приходят с сервера обычным HTML (инвариант 1).
 */
export function DiagnosticsPicker({ symptoms, defaultSymptom }: DiagnosticsPickerProps) {
  const uid = useId();
  const [chosenKey, setChosenKey] = useState<string | null>(null);

  // Активный ключ выводится, а не хранится: список симптомов может прийти
  // снаружи и смениться, и запомненный ключ тогда указывал бы в пустоту.
  const fallback = symptoms.find((item) => item.key === defaultSymptom) ?? symptoms[0];
  const active = symptoms.find((item) => item.key === chosenKey) ?? fallback;

  const panelId = (key: string): string => `${uid}-${key}`;
  const labelId = `${uid}-label`;

  return (
    <div className={styles.picker}>
      <p className={styles.chipsLabel} id={labelId}>
        {t.chipsLabel}
      </p>

      <div className={styles.chips} role="group" aria-labelledby={labelId}>
        {symptoms.map((symptom) => (
          <Chip
            key={symptom.key}
            selected={symptom.key === active?.key}
            aria-controls={panelId(symptom.key)}
            onClick={() => setChosenKey(symptom.key)}
          >
            {symptom.label}
          </Chip>
        ))}
      </div>

      {/* смена симптома объявляется голосом: меняется содержимое области */}
      <div className={styles.panels} aria-live="polite">
        {symptoms.map((symptom) => (
          <SymptomCard
            key={symptom.key}
            id={panelId(symptom.key)}
            symptom={symptom}
            active={symptom.key === active?.key}
          />
        ))}
      </div>
    </div>
  );
}

type SymptomCardProps = {
  readonly id: string;
  readonly symptom: Symptom;
  readonly active: boolean;
};

function SymptomCard({ id, symptom, active }: SymptomCardProps) {
  const titleId = `${id}-title`;

  return (
    <article
      id={id}
      className={styles.panel}
      hidden={!active}
      aria-labelledby={titleId}
      data-symptom={symptom.key}
    >
      <h3 id={titleId} className={styles.panelTitle}>
        {symptom.title}
      </h3>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt className={styles.factLabel}>{t.causesLabel}</dt>
          <dd className={styles.factValue}>{symptom.causes}</dd>
        </div>

        <div className={styles.fact}>
          <dt className={styles.factLabel}>{t.fixLabel}</dt>
          <dd className={styles.factValue}>{symptom.fix}</dd>
        </div>

        <div className={styles.fact}>
          <dt className={styles.factLabel}>{t.priceLabel}</dt>
          {symptom.priceFrom === undefined ? (
            <dd className={styles.priceUnknown}>{t.priceUnknown}</dd>
          ) : (
            <dd className={styles.price}>{t.priceFrom(formatMoney(symptom.priceFrom))}</dd>
          )}
        </div>
      </dl>
    </article>
  );
}
