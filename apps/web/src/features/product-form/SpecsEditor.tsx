'use client';

import { useId } from 'react';

import { EMPTY_SPEC_DICTIONARY, type SpecDictionary } from '@/entities/product/lib/groupSpecs';
import { Button, Input, Select, type FormSectionLevel } from '@/shared/ui';

import { productFormContent as texts } from './content';
import type { SpecPair } from './model';
import styles from './ProductForm.module.css';

export interface SpecsEditorProps {
  readonly specs: readonly SpecPair[];
  readonly disabled: boolean;
  readonly onChange: (next: readonly SpecPair[]) => void;
  /**
   * Справочник характеристик из настроек: подсказывает названия и позволяет
   * добавить типовой набор группы одним нажатием (ADR-094).
   *
   * 🔴 Он ничего не ограничивает: поле остаётся обычным текстовым, и своя
   * характеристика заводится ровно как раньше (инвариант 6).
   */
  readonly dictionary?: SpecDictionary | undefined;
  /**
   * Вес легенды: она стоит вместо заголовка раздела и обязана весить столько
   * же, сколько соседние заголовки, — иначе внутри окна «Характеристики»
   * кричат громче «Основного» (см. `FormSectionLevel`).
   */
  readonly titleLevel?: FormSectionLevel | undefined;
}

/**
 * Характеристики модели — произвольные пары «название → значение».
 *
 * 🔴 Списка характеристик здесь нет и быть не может (ADR-015, инвариант 6):
 * таблица сравнения на сайте собирается объединением ключей всех видимых
 * моделей. Владелец добавляет характеристику, которой раньше не было, и она
 * появляется в таблице сама — без разработчика.
 */
export function SpecsEditor({
  specs,
  disabled,
  onChange,
  dictionary = EMPTY_SPEC_DICTIONARY,
  titleLevel = 2,
}: SpecsEditorProps) {
  const listId = useId();

  const replace = (index: number, patch: Partial<SpecPair>): void => {
    onChange(specs.map((spec, at) => (at === index ? { ...spec, ...patch } : spec)));
  };

  /* Уже заполненные названия не предлагаем второй раз: дубль ключа в таблице
     сравнения превращается в строку, у которой значение берётся от первого
     вхождения, — то есть в тихо потерянную характеристику. */
  const taken = new Set(specs.map((spec) => spec.k.trim()).filter((k) => k !== ''));

  const suggestions = dictionary.groups.flatMap((group) =>
    group.fields.map((field) => ({ ...field, group: group.title })),
  );

  const addGroup = (title: string): void => {
    const group = dictionary.groups.find((candidate) => candidate.title === title);
    if (group === undefined) return;

    const fresh = group.fields
      .filter((field) => !taken.has(field.k))
      .map((field) => ({ k: field.k, v: '' }));

    if (fresh.length === 0) return;

    /* Пустые строки, оставшиеся от прошлых нажатий, не копим: добавляем
       набор вместо них. */
    onChange([...specs.filter((spec) => spec.k.trim() !== '' || spec.v.trim() !== ''), ...fresh]);
  };

  return (
    <fieldset className={styles.specs} disabled={disabled}>
      <legend className={titleLevel === 3 ? `${styles.legend} ${styles.legendSub}` : styles.legend}>
        {texts.sectionSpecs}
      </legend>
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
            list={suggestions.length === 0 ? undefined : listId}
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
            variant="light"
            size="sm"
            aria-label={texts.specRemove(index + 1)}
            onClick={() => onChange(specs.filter((_, at) => at !== index))}
          >
            ✕
          </Button>
        </div>
      ))}

      {/* Подсказки, а не список допустимых значений: `datalist` предлагает
          названия из справочника и не мешает вписать своё. */}
      {suggestions.length === 0 ? null : (
        <datalist id={listId}>
          {suggestions.map((field) => (
            <option key={`${field.group}:${field.k}`} value={field.k}>
              {field.unit === '' ? field.group : `${field.group} · ${field.unit}`}
            </option>
          ))}
        </datalist>
      )}

      <div className={styles.specActions}>
        <Button
          type="button"
          variant="bordered"
          size="sm"
          onClick={() => onChange([...specs, { k: '', v: '' }])}
        >
          {texts.specAdd}
        </Button>

        {dictionary.groups.length === 0 ? null : (
          <Select
            aria-label={texts.specsFromGroup}
            value=""
            onChange={(event) => addGroup(event.target.value)}
            options={[
              { value: '', label: texts.specsFromGroup },
              ...dictionary.groups.map((group) => ({ value: group.title, label: group.title })),
            ]}
          />
        )}
      </div>
    </fieldset>
  );
}
