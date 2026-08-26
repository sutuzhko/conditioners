'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Card, Input, PhoneInput, Textarea, useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { clientManagerContent as texts } from './content';
import { clientApi } from './lib';
import { emptyClientDraft, type ClientApi, type ClientDraft, type ClientStatus } from './model';
import styles from './ClientForm.module.css';

export interface ClientFormProps {
  /** Действия раздела. Подменяются в историях и тестах, чтобы не поднимать сеть. */
  readonly api?: ClientApi | undefined;
  /** Идентификатор существующей карточки; без него форма заводит нового клиента. */
  readonly clientId?: string | undefined;
  readonly initial?: ClientDraft | undefined;
  readonly title?: string | undefined;
  readonly hint?: string | undefined;
  readonly onSaved?: (() => void) | undefined;
  /** Показывать ли удаление карточки. Только у существующего клиента. */
  readonly removable?: boolean | undefined;
  /** Подтверждение выведено пропом: тесты и истории не зовут окно браузера. */
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

/**
 * Форма клиента — одна и на заведение, и на правку.
 *
 * Поля те же, отличается только действие: два компонента означали бы два
 * списка полей, а они разошлись бы на первой же новой строке в карточке.
 */
export function ClientForm({
  api = clientApi,
  clientId,
  initial = emptyClientDraft,
  title = texts.addTitle,
  hint = texts.addHint,
  onSaved,
  removable = false,
  confirmRemove,
}: ClientFormProps) {
  /* Подтверждение — общий диалог кита (ADR-113); проп остаётся швом
     для тестов, чтобы не открывать окно ради проверки удаления. */
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const router = useRouter();
  const [draft, setDraft] = useState<ClientDraft>(initial);
  const [status, setStatus] = useState<ClientStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const sending = status === 'sending';
  const busy = sending || removing;
  const editing = clientId !== undefined;

  const set = <K extends keyof ClientDraft>(key: K, value: string): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
    setFieldError((prev) => (prev?.field === key ? null : prev));
  };

  const errorFor = (field: keyof ClientDraft): string | undefined =>
    fieldError?.field === field ? fieldError.message : undefined;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;

    setStatus('sending');
    setMessage('');
    setFieldError(null);

    const result = editing ? await api.update(clientId, draft) : await api.create(draft);

    if (result.ok) {
      /* Заведение очищает форму, правка — оставляет: человек продолжает
         смотреть на карточку, которую только что сохранил. */
      if (!editing) setDraft(emptyClientDraft);
      setStatus('success');
      onSaved?.();
      return;
    }

    setStatus('error');
    if (result.field === undefined) setMessage(result.message);
    else setFieldError({ field: result.field, message: result.message });
  };

  /**
   * Удаление карточки — в том числе по требованию человека (152-ФЗ).
   * Обращения при этом остаются: у них своё согласие и свой срок хранения.
   */
  const handleRemove = async (id: string): Promise<void> => {
    if (busy) return;
    if (!(await ask(texts.removeConfirm(draft.name)))) return;

    setRemoving(true);
    setMessage('');

    const result = await api.remove(id);

    if (result.ok) {
      router.push('/admin/clients');
      return;
    }

    setRemoving(false);
    setStatus('error');
    setMessage(result.message);
  };

  return (
    <Card as="section">
      <form className={styles.form} onSubmit={submit} noValidate>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.hint}>{hint}</p>

        <div className={styles.grid}>
          <Input
            label={texts.name}
            value={draft.name}
            disabled={busy}
            error={errorFor('name')}
            autoComplete="off"
            onChange={(event) => set('name', event.target.value)}
          />
          <PhoneInput
            label={texts.phone}
            value={draft.phone}
            disabled={busy}
            error={errorFor('phone')}
            onChange={(phone) => set('phone', phone)}
          />
          <Input
            label={texts.address}
            hint={texts.addressHint}
            value={draft.address}
            disabled={busy}
            error={errorFor('address')}
            autoComplete="off"
            wrapperClassName={styles.wide}
            onChange={(event) => set('address', event.target.value)}
          />
          <Textarea
            label={texts.note}
            hint={texts.noteHint}
            rows={2}
            value={draft.note}
            disabled={busy}
            error={errorFor('note')}
            wrapperClassName={styles.wide}
            onChange={(event) => set('note', event.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={busy}>
            {sending ? sendingLabel(editing) : idleLabel(editing)}
          </Button>

          {status === 'success' ? (
            <span className={styles.ok} role="status">
              {editing ? texts.saved : texts.added}
            </span>
          ) : null}

          {removable && editing ? (
            <Button
              type="button"
              variant="ghost"
              className={styles.remove}
              loading={removing}
              disabled={sending}
              onClick={() => void handleRemove(clientId)}
            >
              {texts.remove}
            </Button>
          ) : null}
        </div>

        {removable && editing ? <p className={styles.removeHint}>{texts.removeHint}</p> : null}

        {status === 'error' && message !== '' ? (
          <p className={styles.error} role="alert">
            {message}
          </p>
        ) : null}
      </form>

      {dialog}
    </Card>
  );
}

function idleLabel(editing: boolean): string {
  return editing ? texts.save : texts.add;
}

function sendingLabel(editing: boolean): string {
  return editing ? texts.saving : texts.adding;
}
