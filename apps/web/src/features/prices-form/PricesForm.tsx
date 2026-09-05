'use client';

import { useState, type FormEvent } from 'react';

import { Button, Card, Icon, IconButton, Input, useConfirm } from '@/shared/ui';

import { pricesFormContent as texts } from './content';
import { putPrices, rowOfField, rowsWithoutClass } from './lib';
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
  /* Строки, у которых не заполнен класс. Множество, а не одна: владелец правит
     таблицу целиком, и назвать ему только первую ошибку — заставить нажимать
     «Сохранить» столько раз, сколько строк он забыл. */
  const [badRows, setBadRows] = useState<readonly number[]>([]);
  /* Подтверждение необратимой правки — общий диалог кита, а не окно
     браузера: системное окно нельзя объяснить (ADR-113). */
  const { confirm, dialog } = useConfirm();

  const sending = status === 'sending';

  const setRow = (index: number, patch: Partial<PriceRowValues>): void => {
    setValues((prev) => ({
      ...prev,
      prices: prev.prices.map((row, at) => (at === index ? { ...row, ...patch } : row)),
    }));
    setStatus('idle');
    // правка снимает отметку со своей строки, а не со всей таблицы
    setBadRows((prev) => prev.filter((at) => at !== index));
  };

  /**
   * Удаление строки прайса.
   *
   * 🔴 Спрашивает подтверждение, когда в строке что-то есть: набранные цена,
   * мощность и срок исчезают безвозвратно — формa прежних значений не хранит,
   * а «Отменить» у неё нет. Пустая строка не спрашивает: терять нечего, а
   * лишний вопрос учит нажимать «Да» не глядя.
   */
  const removeRow = async (index: number): Promise<void> => {
    const row = values.prices[index];
    if (row === undefined) return;

    const filled = Object.values(row).some((cell) => cell.trim() !== '');

    if (filled) {
      const confirmed = await confirm({
        title: texts.rowRemoveTitle(index + 1),
        description: texts.rowRemoveText(row.cls.trim()),
        confirmLabel: texts.rowRemoveConfirm,
        cancelLabel: texts.rowRemoveCancel,
      });

      if (!confirmed) return;
    }

    setValues((prev) => ({ ...prev, prices: prev.prices.filter((_, at) => at !== index) }));
    setStatus('idle');
    setBadRows((prev) => prev.filter((at) => at !== index));
  };

  const setExtra = (key: keyof ExtrasValues, value: string): void => {
    setValues((prev) => ({ ...prev, extras: { ...prev.extras, [key]: value } }));
    setStatus('idle');
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    /* 🔴 Проверка до отправки, а не после. Строка без класса раньше молча
       отбрасывалась на пути к серверу, и человек видел «Сохранено». */
    const incomplete = rowsWithoutClass(values);
    if (incomplete.length > 0) {
      setStatus('error');
      setBadRows(incomplete);
      setMessage(texts.rowsWithoutClass);
      return;
    }

    setStatus('sending');
    setMessage('');
    setBadRows([]);

    const result = await save(values);

    if (result.ok) {
      setStatus('success');
      onSaved?.();
      return;
    }

    setStatus('error');
    setMessage(result.message ?? texts.serverError);

    /* Отказ сервера тоже адресуется строке, если он про неё: контракт отдаёт
       `field` вида `prices.3.cls`, и разбирать его в вёрстке незачем. */
    const row = rowOfField(result.field);
    setBadRows(row === null ? [] : [row]);
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
                  label={texts.cls}
                  wrapperClassName={styles.cell}
                  value={row.cls}
                  disabled={sending}
                  error={badRows.includes(index) ? texts.rowWithoutClass : undefined}
                  onChange={(event) => setRow(index, { cls: event.target.value })}
                />
                <Input
                  aria-label={`${texts.power} ${index + 1}`}
                  label={texts.power}
                  wrapperClassName={styles.cell}
                  value={row.power}
                  disabled={sending}
                  onChange={(event) => setRow(index, { power: event.target.value })}
                />
                <Input
                  aria-label={`${texts.area} ${index + 1}`}
                  label={texts.area}
                  wrapperClassName={styles.cell}
                  value={row.area}
                  disabled={sending}
                  onChange={(event) => setRow(index, { area: event.target.value })}
                />
                <Input
                  aria-label={`${texts.price} ${index + 1}`}
                  label={texts.price}
                  wrapperClassName={styles.cell}
                  type="number"
                  value={row.price}
                  disabled={sending}
                  onChange={(event) => setRow(index, { price: event.target.value })}
                />
                <Input
                  aria-label={`${texts.term} ${index + 1}`}
                  label={texts.term}
                  wrapperClassName={styles.cell}
                  value={row.term}
                  disabled={sending}
                  onChange={(event) => setRow(index, { term: event.target.value })}
                />
                {/* Подпись кнопки полная и уникальная («Удалить строку 2»):
                    диктор читает список одинаковых «Удалить» без пользы. */}
                <IconButton
                  label={texts.rowRemove(index + 1)}
                  icon={<Icon name="close" size={16} />}
                  disabled={sending}
                  onClick={() => {
                    void removeRow(index);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="bordered"
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

      {/* Окно живёт вне строк таблицы: подтверждение не принадлежит строке,
          которую оно спрашивает удалить. */}
      {dialog}
    </form>
  );
}
