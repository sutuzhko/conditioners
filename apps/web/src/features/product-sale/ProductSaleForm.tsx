'use client';

import { useState, type FormEvent } from 'react';

import { Button, Card, Input } from '@/shared/ui';

import { productSaleContent as texts } from './content';
import { explainInactive, previewSale } from './lib';
import { emptySaleValues, type SaleFormValues, type SaleSave, type SaleStatus } from './model';
import styles from './ProductSaleForm.module.css';

export interface ProductSaleFormProps {
  /** Обычная цена модели: от неё считается процент. */
  readonly priceNum: number;
  readonly values: SaleFormValues;
  readonly save: SaleSave;
  readonly onSaved?: (() => void) | undefined;
  /** Момент расчёта предпросмотра. Пропсом — чтобы истории и тесты не зависели от календаря. */
  readonly now?: Date | undefined;
}

/**
 * Скидка на модель.
 *
 * 🔴 Отдельная форма и отдельная ручка, а не поле в карточке товара: так у
 * перечёркнутой цены остаётся ровно одно место рождения (инвариант 14).
 *
 * Предпросмотр считается той же функцией, что и витрина: владелец видит
 * именно то, что увидит посетитель, и до сохранения.
 */
export function ProductSaleForm({
  priceNum,
  values: initial,
  save,
  onSaved,
  now,
}: ProductSaleFormProps) {
  const [values, setValues] = useState<SaleFormValues>(initial);
  const [status, setStatus] = useState<SaleStatus>('idle');
  const [message, setMessage] = useState('');

  const sending = status === 'sending';
  const preview = previewSale(values, priceNum, now);
  const inactiveReason = explainInactive(values, priceNum);

  const set = <K extends keyof SaleFormValues>(key: K, value: SaleFormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
  };

  const send = async (next: SaleFormValues): Promise<void> => {
    if (sending) return;

    setStatus('sending');
    setMessage('');

    const result = await save(next);

    if (result.ok) {
      setStatus('success');
      onSaved?.();
      return;
    }

    setStatus('error');
    setMessage(result.message ?? texts.serverError);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await send(values);
  };

  return (
    <Card as="section" aria-labelledby="sale-title">
      <h2 className={styles.title} id="sale-title">
        {texts.title}
      </h2>
      <p className={styles.hint}>{texts.hint}</p>

      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.fields}>
          <Input
            label={texts.salePrice}
            hint={texts.salePriceHint}
            type="number"
            value={values.salePrice}
            disabled={sending}
            onChange={(event) => set('salePrice', event.target.value)}
          />
          <Input
            label={texts.saleFrom}
            hint={texts.saleFromHint}
            type="date"
            value={values.saleFrom}
            disabled={sending}
            onChange={(event) => set('saleFrom', event.target.value)}
          />
          <Input
            label={texts.saleTo}
            hint={texts.saleToHint}
            type="date"
            value={values.saleTo}
            disabled={sending}
            onChange={(event) => set('saleTo', event.target.value)}
          />
          <Input
            label={texts.saleLabel}
            hint={texts.saleLabelHint}
            value={values.saleLabel}
            disabled={sending}
            onChange={(event) => set('saleLabel', event.target.value)}
          />
        </div>

        {/* Предупреждение, а не ошибка: сервер такие значения примет, но
            скидки на сайте не будет — промолчать значит обмануть владельца. */}
        {inactiveReason === null ? null : (
          <p className={styles.warning} role="status">
            {inactiveReason}
          </p>
        )}

        {preview.saleActive && preview.discountPercent !== null && preview.oldPrice !== null ? (
          <p className={styles.preview} role="status">
            {texts.preview(preview.discountPercent, preview.currentPrice, preview.oldPrice)}
          </p>
        ) : null}

        {message === '' ? null : (
          <p className={styles.error} role="alert">
            {message}
          </p>
        )}

        <div className={styles.actions}>
          <Button type="submit" loading={sending}>
            {sending ? texts.saving : texts.save}
          </Button>

          {values.salePrice.trim() === '' ? null : (
            <Button
              type="button"
              variant="ghost"
              disabled={sending}
              onClick={() => {
                setValues(emptySaleValues);
                void send(emptySaleValues);
              }}
            >
              {texts.clear}
            </Button>
          )}

          {status === 'success' ? (
            <p className={styles.saved} role="status">
              {texts.saved}
            </p>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
