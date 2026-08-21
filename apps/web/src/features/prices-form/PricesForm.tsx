'use client';

import { useState, type FormEvent } from 'react';

import { Button, Card, Input } from '@/shared/ui';

import { pricesFormContent as texts } from './content';
import { putPrices } from './lib';
import {
  emptyPriceRow,
  type ExtrasValues,
  type PriceRowValues,
  type PricesFormValues,
  type PricesSave,
  type PricesStatus,
} from './model';
import styles from './PricesForm.module.css';

export interface PricesFormProps {
  readonly values: PricesFormValues;
  readonly save?: PricesSave | undefined;
  readonly onSaved?: (() => void) | undefined;
}

/** Поля ставок допработ: подпись, ключ и подсказка. */
const EXTRA_FIELDS: readonly {
  key: keyof ExtrasValues;
  label: string;
  hint?: string;
}[] = [
  { key: 'trassaIncludedM', label: texts.trassaIncludedM },
  { key: 'trassaPerM', label: texts.trassaPerM },
  { key: 'shtrobPerM', label: texts.shtrobPerM },
  { key: 'heightWorks', label: texts.heightWorks },
  { key: 'heightFloorFrom', label: texts.heightFloorFrom, hint: texts.heightFloorHint },
];

/**
 * Прайс монтажа и ставки допработ.
 *
 * Прайс уходит целиком: строку удаляют, добавляют и переписывают в одной
 * форме, и промежуточное состояние с половиной классов на сайте недопустимо.
 */
export function PricesForm({ values: initial, save = putPrices, onSaved }: PricesFormProps) {
  const [values, setValues] = useState<PricesFormValues>(initial);
  const [status, setStatus] = useState<PricesStatus>('idle');
  const [message, setMessage] = useState('');

  const sending = status === 'sending';

  const setRow = (index: number, patch: Partial<PriceRowValues>): void => {
    setValues((prev) => ({
      ...prev,
      prices: prev.prices.map((row, at) => (at === index ? { ...row, ...patch } : row)),
    }));
    setStatus('idle');
  };

  const setExtra = (key: keyof ExtrasValues, value: string): void => {
    setValues((prev) => ({ ...prev, extras: { ...prev.extras, [key]: value } }));
    setStatus('idle');
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    setStatus('sending');
    setMessage('');

    const result = await save(values);

    if (result.ok) {
      setStatus('success');
      onSaved?.();
      return;
    }

    setStatus('error');
    setMessage(result.message ?? texts.serverError);
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Card as="section">
        <h2 className={styles.title}>{texts.sectionPrices}</h2>
        <p className={styles.hint}>{texts.pricesHint}</p>

        {values.prices.length === 0 ? <p className={styles.empty}>{texts.rowsEmpty}</p> : null}

        {values.prices.length === 0 ? null : (
          <div className={styles.rows}>
            {/* Подписи колонок отдельной строкой: повторять их у каждого поля
                значит утроить высоту таблицы. Скринридеру подписи достаются
                через aria-label самих полей. */}
            <div className={styles.head} aria-hidden="true">
              <span>{texts.cls}</span>
              <span>{texts.power}</span>
              <span>{texts.area}</span>
              <span>{texts.price}</span>
              <span>{texts.term}</span>
              <span />
            </div>

            {values.prices.map((row, index) => (
              // Индекс как ключ: строки не переупорядочиваются, а различить
              // две пустые больше нечем.
              <div className={styles.row} key={index}>
                <Input
                  aria-label={`${texts.cls} ${index + 1}`}
                  value={row.cls}
                  disabled={sending}
                  onChange={(event) => setRow(index, { cls: event.target.value })}
                />
                <Input
                  aria-label={`${texts.power} ${index + 1}`}
                  value={row.power}
                  disabled={sending}
                  onChange={(event) => setRow(index, { power: event.target.value })}
                />
                <Input
                  aria-label={`${texts.area} ${index + 1}`}
                  value={row.area}
                  disabled={sending}
                  onChange={(event) => setRow(index, { area: event.target.value })}
                />
                <Input
                  aria-label={`${texts.price} ${index + 1}`}
                  type="number"
                  value={row.price}
                  disabled={sending}
                  onChange={(event) => setRow(index, { price: event.target.value })}
                />
                <Input
                  aria-label={`${texts.term} ${index + 1}`}
                  value={row.term}
                  disabled={sending}
                  onChange={(event) => setRow(index, { term: event.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={sending}
                  aria-label={texts.rowRemove(index + 1)}
                  onClick={() =>
                    setValues((prev) => ({
                      ...prev,
                      prices: prev.prices.filter((_, at) => at !== index),
                    }))
                  }
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={sending}
          onClick={() =>
            setValues((prev) => ({ ...prev, prices: [...prev.prices, emptyPriceRow] }))
          }
        >
          {texts.rowAdd}
        </Button>
      </Card>

      <Card as="section">
        <h2 className={styles.title}>{texts.sectionExtras}</h2>
        <p className={styles.hint}>{texts.extrasHint}</p>

        <div className={styles.extras}>
          {EXTRA_FIELDS.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              hint={field.hint}
              type="number"
              value={values.extras[field.key]}
              disabled={sending}
              onChange={(event) => setExtra(field.key, event.target.value)}
            />
          ))}
        </div>
      </Card>

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      <div className={styles.actions}>
        <Button type="submit" loading={sending}>
          {sending ? texts.saving : texts.save}
        </Button>

        {status === 'success' ? (
          <p className={styles.saved} role="status">
            {texts.saved}
          </p>
        ) : null}
      </div>
    </form>
  );
}
