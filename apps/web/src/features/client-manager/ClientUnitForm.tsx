'use client';

import { useState, type FormEvent } from 'react';

import {
  Button,
  DateField,
  EMPTY_DATE,
  Input,
  dateSegmentsOf,
  isoOfDateSegments,
} from '@/shared/ui';
import type { DateSegments } from '@/shared/ui';

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
  /* 🔴 Даты живут в форме двумя видами: сегментами — потому что их набирают,
     и строкой ISO — потому что её ждут схема и контракт. Выводить сегменты из
     строки на каждый рендер нельзя: пока набран один день, полной даты ещё
     нет, строка пуста, и набранная цифра пропала бы прямо под пальцами. */
  const [installedParts, setInstalledParts] = useState<DateSegments>(() =>
    dateSegmentsOf(draft.installedAt),
  );
  const [warrantyParts, setWarrantyParts] = useState<DateSegments>(() =>
    dateSegmentsOf(draft.warrantyUntil),
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
      if (!editing) {
        setDraft(emptyUnitDraft);

        /* 🔴 Сегменты очищаются вместе с черновиком: они отдельное состояние
           поля, и без этого вторая запись заводилась бы с датой первой,
           оставшейся на экране при пустой строке в теле запроса. */
        setInstalledParts(EMPTY_DATE);
        setWarrantyParts(EMPTY_DATE);
      }
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
        {/* 🔴 Три сегмента вместо `input[type=date]` (кит, `DateField`):
            нативный редактор приносит свой порядок сегментов, зависящий от
            локали системы, — на машине с английской локалью владелец получил
            бы месяц перед днём и не заметил бы этого (issue #586). */}
        <DateField
          label={texts.unitInstalledAt}
          value={installedParts}
          disabled={sending}
          error={errorFor('installedAt')}
          onChange={(next) => {
            setInstalledParts(next);
            set('installedAt', isoOfDateSegments(next));
          }}
        />
        <DateField
          label={texts.unitWarrantyUntil}
          hint={texts.unitWarrantyHint}
          value={warrantyParts}
          disabled={sending}
          error={errorFor('warrantyUntil')}
          onChange={(next) => {
            setWarrantyParts(next);
            set('warrantyUntil', isoOfDateSegments(next));
          }}
        />
      </div>

      <div className={styles.actions}>
        <Button type="submit" size="sm" disabled={sending}>
          {sending ? sendingLabel(editing) : texts.unitSave}
        </Button>

        {onCancel === undefined ? null : (
          <Button type="button" variant="light" size="sm" disabled={sending} onClick={onCancel}>
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
