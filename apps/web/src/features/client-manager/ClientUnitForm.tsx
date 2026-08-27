'use client';

import { useState, type FormEvent } from 'react';

import { Button, Input } from '@/shared/ui';

import { clientManagerContent as texts } from './content';
import { clientUnitApi } from './lib';
import {
  emptyUnitDraft,
  unitDraftOf,
  type ClientStatus,
  type ClientUnitApi,
  type ClientUnitCard,
  type ClientUnitDraft,
} from './model';
import styles from './ClientUnitForm.module.css';

export interface ClientUnitFormProps {
  readonly clientId: string;
  /** Правка существующей записи; без неё форма заводит новую. */
  readonly unit?: ClientUnitCard | undefined;
  /** Действия раздела. Подменяются в историях и тестах, чтобы не поднимать сеть. */
  readonly api?: ClientUnitApi | undefined;
  readonly onSaved?: (() => void) | undefined;
  readonly onCancel?: (() => void) | undefined;
}

/**
 * Форма записи о технике — одна и на заведение, и на правку.
 *
 * Руками заводят то, что поставили до этой системы или не мы: половина
 * клиентов пришла с уже стоящим оборудованием (CRM.md §3.2). Из наряда запись
 * появляется сама, и трогать её после этого обычно незачем — но дату монтажа
 * и гарантию поправить можно: от них считается и ТО, и гарантийный случай.
 */
export function ClientUnitForm({
  clientId,
  unit,
  api = clientUnitApi,
  onSaved,
  onCancel,
}: ClientUnitFormProps) {
  const editing = unit !== undefined;
  const [draft, setDraft] = useState<ClientUnitDraft>(
    unit === undefined ? emptyUnitDraft : unitDraftOf(unit),
  );
  const [status, setStatus] = useState<ClientStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);

  const sending = status === 'sending';

  const set = <K extends keyof ClientUnitDraft>(key: K, value: string): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
    setFieldError((prev) => (prev?.field === key ? null : prev));
  };

  const errorFor = (field: keyof ClientUnitDraft): string | undefined =>
    fieldError?.field === field ? fieldError.message : undefined;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    setStatus('sending');
    setMessage('');
    setFieldError(null);

    const result = editing
      ? await api.update(clientId, unit.id, draft)
      : await api.create(clientId, draft);

    if (result.ok) {
      /* Заведение очищает форму: техники у человека бывает несколько, и
         вторую запись заводят следом за первой. */
      if (!editing) setDraft(emptyUnitDraft);
      setStatus('success');
      onSaved?.();
      return;
    }

    setStatus('error');
    if (result.field === undefined) setMessage(result.message);
    else setFieldError({ field: result.field, message: result.message });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <h3 className={styles.title}>{editing ? texts.unitEditTitle : texts.unitAddTitle}</h3>
      <p className={styles.hint}>{editing ? texts.unitEditHint : texts.unitAddHint}</p>

      <div className={styles.grid}>
        <Input
          label={texts.unitModel}
          hint={texts.unitModelHint}
          value={draft.model}
          disabled={sending}
          error={errorFor('model')}
          autoComplete="off"
          wrapperClassName={styles.wide}
          onChange={(event) => set('model', event.target.value)}
        />
        <Input
          label={texts.unitInstalledAt}
          type="date"
          value={draft.installedAt}
          disabled={sending}
          error={errorFor('installedAt')}
          onChange={(event) => set('installedAt', event.target.value)}
        />
        <Input
          label={texts.unitWarrantyUntil}
          hint={texts.unitWarrantyHint}
          type="date"
          value={draft.warrantyUntil}
          disabled={sending}
          error={errorFor('warrantyUntil')}
          onChange={(event) => set('warrantyUntil', event.target.value)}
        />
      </div>

      <div className={styles.actions}>
        <Button type="submit" size="sm" disabled={sending}>
          {sending ? sendingLabel(editing) : texts.unitSave}
        </Button>

        {onCancel === undefined ? null : (
          <Button type="button" variant="ghost" size="sm" disabled={sending} onClick={onCancel}>
            {texts.unitCancel}
          </Button>
        )}

        {status === 'success' ? (
          <span className={styles.ok} role="status">
            {texts.saved}
          </span>
        ) : null}
      </div>

      {status === 'error' && message !== '' ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}

function sendingLabel(editing: boolean): string {
  return editing ? texts.unitSaving : texts.unitAdding;
}
