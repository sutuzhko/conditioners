'use client';

import { useState, type FormEvent } from 'react';

import { Button, Card, Input } from '@/shared/ui';

import { specsDictionaryContent as texts } from './content';
import { putSpecs } from './lib';
import {
  emptyField,
  emptyGroup,
  type SaveSpecs,
  type SpecDictionaryDraft,
  type SpecFieldDraft,
  type SpecGroupDraft,
  type SpecsStatus,
} from './model';
import styles from './SpecsDictionaryForm.module.css';

export interface SpecsDictionaryFormProps {
  readonly value: SpecDictionaryDraft;
  readonly save?: SaveSpecs | undefined;
}

/**
 * Правка справочника характеристик.
 *
 * Форма своя, а не универсальная из `settings-form`: та разбирает плоские
 * группы и список объектов одного уровня, а здесь уровня два — группы, внутри
 * которых поля. Расширять универсальную форму вложенностью ради одного
 * раздела дороже, чем написать этот.
 */
export function SpecsDictionaryForm({ value: initial, save = putSpecs }: SpecsDictionaryFormProps) {
  const [value, setValue] = useState<SpecDictionaryDraft>(initial);
  const [status, setStatus] = useState<SpecsStatus>('idle');
  const [message, setMessage] = useState('');

  const sending = status === 'sending';

  const setGroups = (groups: readonly SpecGroupDraft[]): void => {
    setValue({ groups });
    setStatus('idle');
  };

  const patchGroup = (index: number, patch: Partial<SpecGroupDraft>): void => {
    setGroups(value.groups.map((group, at) => (at === index ? { ...group, ...patch } : group)));
  };

  const patchField = (
    groupIndex: number,
    fieldIndex: number,
    patch: Partial<SpecFieldDraft>,
  ): void => {
    const group = value.groups[groupIndex];
    if (group === undefined) return;

    patchGroup(groupIndex, {
      fields: group.fields.map((field, at) => (at === fieldIndex ? { ...field, ...patch } : field)),
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    setStatus('sending');
    setMessage('');

    const result = await save(value);

    if (result.ok) {
      setStatus('success');
      return;
    }

    setStatus('error');
    setMessage(result.message);
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {value.groups.length === 0 ? <p className={styles.empty}>{texts.empty}</p> : null}

      {value.groups.map((group, groupIndex) => (
        // Индекс как ключ: группы не переупорядочиваются, а различить две
        // пустые больше нечем.
        <Card as="section" key={groupIndex}>
          <div className={styles.groupHead}>
            <Input
              label={texts.groupTitle}
              wrapperClassName={styles.groupTitle}
              value={group.title}
              disabled={sending}
              onChange={(event) => patchGroup(groupIndex, { title: event.target.value })}
            />
            <Button
              type="button"
              variant="light"
              size="sm"
              disabled={sending}
              aria-label={texts.groupRemove(groupIndex + 1)}
              onClick={() => setGroups(value.groups.filter((_, at) => at !== groupIndex))}
            >
              ✕
            </Button>
          </div>

          <div className={styles.fields}>
            {group.fields.map((field, fieldIndex) => (
              <div className={styles.fieldRow} key={fieldIndex}>
                <Input
                  aria-label={`${texts.fieldName} ${fieldIndex + 1}`}
                  placeholder={texts.fieldName}
                  wrapperClassName={styles.fieldName}
                  value={field.k}
                  disabled={sending}
                  onChange={(event) =>
                    patchField(groupIndex, fieldIndex, { k: event.target.value })
                  }
                />
                <Input
                  aria-label={`${texts.fieldUnit} ${fieldIndex + 1}`}
                  placeholder={texts.fieldUnit}
                  wrapperClassName={styles.fieldUnit}
                  value={field.unit}
                  disabled={sending}
                  onChange={(event) =>
                    patchField(groupIndex, fieldIndex, { unit: event.target.value })
                  }
                />
                <Input
                  aria-label={`${texts.fieldHint} ${fieldIndex + 1}`}
                  placeholder={texts.fieldHint}
                  wrapperClassName={styles.fieldHint}
                  value={field.hint}
                  disabled={sending}
                  onChange={(event) =>
                    patchField(groupIndex, fieldIndex, { hint: event.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="light"
                  size="sm"
                  disabled={sending}
                  aria-label={texts.fieldRemove(fieldIndex + 1)}
                  onClick={() =>
                    patchGroup(groupIndex, {
                      fields: group.fields.filter((_, at) => at !== fieldIndex),
                    })
                  }
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="bordered"
            size="sm"
            disabled={sending}
            onClick={() => patchGroup(groupIndex, { fields: [...group.fields, emptyField] })}
          >
            {texts.fieldAdd}
          </Button>
        </Card>
      ))}

      <div className={styles.actions} data-sticky="bottom">
        <Button
          type="button"
          variant="bordered"
          disabled={sending}
          onClick={() => setGroups([...value.groups, emptyGroup])}
        >
          {texts.groupAdd}
        </Button>

        <Button type="submit" disabled={sending}>
          {sending ? texts.saving : texts.save}
        </Button>

        {status === 'success' ? <span className={styles.ok}>{texts.saved}</span> : null}
      </div>

      {status === 'error' ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
