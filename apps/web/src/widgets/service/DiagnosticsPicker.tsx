'use client';

import { useId, useState, type ReactNode } from 'react';

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
  /**
   * Действие рядом с разбором — кнопка вызова мастера. Приходит слотом:
   * куда она ведёт, решает страница, а не блок.
   */
  readonly action?: ReactNode | undefined;
};

/**
 * Выбор симптома и его разбор.
 *
 * 🔴 Все разборы присутствуют в разметке всегда: неактивные скрыты стилем
 * и `inert`, но остаются в HTML — это индексируемый контент под запросы
 * вида «кондиционер не холодит» (docs/CLAUDE.md, «Доступность»). Подгрузка
 * по клику стоила бы этих запросов целиком.
 *
 * 🔴 Симптомы — сетка, а не лента (issue #272): их ровно шесть, это закрытый
 * список, и человек выбирает из известного набора. Лента прятала половину
 * вариантов там, где прятать нечего.
 *
 * 🔴 Разборы лежат друг на друге в одной ячейке сетки, а не сменяют друг
 * друга через `display: none`: высота блока резервируется по самому длинному
 * разбору, и кнопка «Вызвать мастера» стоит на одном месте при любом выборе.
 * Это измеряется координатой кнопки, а не впечатлением.
 *
 * `'use client'` стоит на этом листе, а не на секции: заголовок и подводка
 * приходят с сервера обычным HTML (инвариант 1).
 */
export function DiagnosticsPicker({ symptoms, defaultSymptom, action }: DiagnosticsPickerProps) {
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
          <SymptomChip
            key={symptom.key}
            symptom={symptom}
            selected={symptom.key === active?.key}
            panelId={panelId(symptom.key)}
            onSelect={() => setChosenKey(symptom.key)}
          />
        ))}
      </div>

      <div className={styles.answer}>
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

        {/* Кнопка одна на все разборы и стоит вне их стопки: её место не
            зависит от того, какой разбор показан. */}
        {action === undefined ? null : <div className={styles.action}>{action}</div>}
      </div>
    </div>
  );
}

type SymptomChipProps = {
  readonly symptom: Symptom;
  readonly selected: boolean;
  readonly panelId: string;
  readonly onSelect: () => void;
};

/**
 * Чип симптома. Полная подпись всегда служит именем кнопки (`aria-label`):
 * на телефоне глазами видна короткая, и она — часть полной слово в слово,
 * так что голосовое управление находит кнопку по тому, что видит человек.
 */
function SymptomChip({ symptom, selected, panelId, onSelect }: SymptomChipProps) {
  const hasShort = symptom.short !== undefined;

  return (
    <Chip
      size="sm"
      selected={selected}
      aria-label={symptom.label}
      aria-controls={panelId}
      className={[styles.chip, hasShort ? styles.chipWithShort : null].filter(Boolean).join(' ')}
      onClick={onSelect}
    >
      <span className={styles.labelFull}>{symptom.label}</span>
      {hasShort ? <span className={styles.labelShort}>{symptom.short}</span> : null}
    </Chip>
  );
}

type SymptomCardProps = {
  readonly id: string;
  readonly symptom: Symptom;
  readonly active: boolean;
};

/**
 * Разбор одного симптома. Неактивный остаётся в потоке — он держит высоту
 * стопки, — но невидим, недоступен фокусу и скрыт от читалки: `inert` и
 * `aria-hidden` вместе с `visibility: hidden` из стиля.
 */
function SymptomCard({ id, symptom, active }: SymptomCardProps) {
  const titleId = `${id}-title`;

  return (
    <article
      id={id}
      className={[styles.panel, active ? null : styles.panelHidden].filter(Boolean).join(' ')}
      inert={!active}
      aria-hidden={!active}
      aria-labelledby={titleId}
      data-symptom={symptom.key}
      data-active={active}
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
