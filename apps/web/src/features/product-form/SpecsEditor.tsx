'use client';

import { Button, Input } from '@/shared/ui';

import { productFormContent as texts } from './content';
import type { SpecPair } from './model';
import styles from './ProductForm.module.css';

export interface SpecsEditorProps {
  readonly specs: readonly SpecPair[];
  readonly disabled: boolean;
  readonly onChange: (next: readonly SpecPair[]) => void;
}

/**
 * Характеристики модели — произвольные пары «название → значение».
 *
 * 🔴 Списка характеристик здесь нет и быть не может (ADR-015, инвариант 6):
 * таблица сравнения на сайте собирается объединением ключей всех видимых
 * моделей. Владелец добавляет характеристику, которой раньше не было, и она
 * появляется в таблице сама — без разработчика.
 */
export function SpecsEditor({ specs, disabled, onChange }: SpecsEditorProps) {
  const replace = (index: number, patch: Partial<SpecPair>): void => {
    onChange(specs.map((spec, at) => (at === index ? { ...spec, ...patch } : spec)));
  };

  return (
    <fieldset className={styles.specs} disabled={disabled}>
      <legend className={styles.legend}>{texts.sectionSpecs}</legend>
      <p className={styles.hint}>{texts.specsHint}</p>

      {specs.length === 0 ? <p className={styles.empty}>{texts.specsEmpty}</p> : null}

      {specs.map((spec, index) => (
        // Индекс как ключ: пары не переупорядочиваются, а две пустые строки
        // различить больше нечем.
        <div className={styles.specRow} key={index}>
          <Input
            aria-label={`${texts.specName} ${index + 1}`}
            placeholder={texts.specName}
            value={spec.k}
            wrapperClassName={styles.specKey}
            onChange={(event) => replace(index, { k: event.target.value })}
          />
          <Input
            aria-label={`${texts.specValue} ${index + 1}`}
            placeholder={texts.specValue}
            value={spec.v}
            wrapperClassName={styles.specValue}
            onChange={(event) => replace(index, { v: event.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={texts.specRemove(index + 1)}
            onClick={() => onChange(specs.filter((_, at) => at !== index))}
          >
            ✕
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...specs, { k: '', v: '' }])}
      >
        {texts.specAdd}
      </Button>
    </fieldset>
  );
}
