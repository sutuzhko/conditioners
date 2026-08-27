'use client';

import { useState, type FormEvent } from 'react';

import { Button, Card, Textarea } from '@/shared/ui';

import { orderManagerContent as texts } from './content';
import {
  resultDraftOf,
  resultFilled,
  type OrderFormStatus,
  type OrderResultDraft,
  type OrderWorkApi,
} from './model';
import styles from './OrderResultForm.module.css';

export interface OrderResultFormProps {
  readonly api: OrderWorkApi;
  readonly extraWork: string | null;
  readonly report: string | null;
  /** Когда итог заполнили. Ставит его сервер, форма только показывает. */
  readonly resultAt: string | null;
  readonly disabled?: boolean | undefined;
  readonly onSaved?: (() => void) | undefined;
}

/**
 * Итог работ: что сделали сверх наряда и отчёт о выезде.
 *
 * 🔴 Одна форма на обе роли. Итог заполняет и владелец, и монтажник — это его
 * отчёт, и второй формы «для монтажника» быть не должно: она разошлась бы с
 * первой на первом же новом поле (docs/CRM.md §3.3).
 *
 * 🔴 Плановой суммы здесь нет вовсе. «Дополнительно два метра трассы» — это
 * текст для разговора с клиентом, а не новая цена заказа: сколько взять,
 * решает владелец в карточке наряда.
 */
export function OrderResultForm({
  api,
  extraWork,
  report,
  resultAt,
  disabled = false,
  onSaved,
}: OrderResultFormProps) {
  const [draft, setDraft] = useState<OrderResultDraft>(() => resultDraftOf({ extraWork, report }));
  const [state, setState] = useState<OrderFormStatus>('idle');
  const [message, setMessage] = useState('');

  const sending = state === 'sending';
  const busy = sending || disabled;

  const set = <Key extends keyof OrderResultDraft>(key: Key, value: string): void => {
    setDraft((current) => ({ ...current, [key]: value }));
    setState('idle');
    setMessage('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;

    setState('sending');
    setMessage('');

    const result = await api.saveResult(draft);

    if (result.ok) {
      setState('success');
      onSaved?.();
      return;
    }

    setState('error');
    setMessage(result.message);
  };

  return (
    <Card as="section" aria-labelledby="order-result-title">
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.head}>
          <h2 className={styles.title} id="order-result-title">
            {texts.resultTitle}
          </h2>

          {/* Время итога — факт с сервера, а не поле формы: часы на телефоне
              монтажника к нему отношения не имеют. */}
          <p className={styles.when}>
            {resultAt === null ? texts.resultEmpty : texts.resultAt(resultAt)}
          </p>
        </div>

        <p className={styles.hint}>{texts.resultHint}</p>

        <fieldset className={styles.group} disabled={busy}>
          <Textarea
            label={texts.extraWork}
            hint={texts.extraWorkHint}
            rows={3}
            value={draft.extraWork}
            onChange={(event) => set('extraWork', event.target.value)}
          />

          <Textarea
            label={texts.report}
            hint={texts.reportHint}
            rows={4}
            value={draft.report}
            onChange={(event) => set('report', event.target.value)}
          />
        </fieldset>

        <div className={styles.actions}>
          <Button type="submit" disabled={busy} loading={sending}>
            {sending ? texts.resultSaving : texts.resultSave}
          </Button>

          {state === 'success' ? (
            <span className={styles.ok} role="status">
              {texts.resultSaved}
            </span>
          ) : null}

          {/* Пустой итог — это очистка, и человек должен понимать это заранее. */}
          {!resultFilled(draft) && resultAt !== null ? (
            <span className={styles.quiet}>{texts.resultEmpty}</span>
          ) : null}
        </div>

        {state === 'error' ? (
          <p className={styles.error} role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
