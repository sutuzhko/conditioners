'use client';

import { useState, type FormEvent } from 'react';

import { Button, Card, Input, PhoneInput } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import { emptyStaffDraft, type StaffApi, type StaffDraft, type StaffStatus } from './model';
import styles from './StaffForm.module.css';

export interface StaffCreateFormProps {
  readonly api: StaffApi;
  readonly onCreated?: (() => void) | undefined;
}

/** Заведение монтажника: имя, логин, телефон и временный пароль. */
export function StaffCreateForm({ api, onCreated }: StaffCreateFormProps) {
  const [draft, setDraft] = useState<StaffDraft>(emptyStaffDraft);
  const [status, setStatus] = useState<StaffStatus>('idle');
  const [message, setMessage] = useState('');

  const sending = status === 'sending';

  const set = (patch: Partial<StaffDraft>): void => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setStatus('idle');
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    setStatus('sending');
    setMessage('');

    const result = await api.create(draft);

    if (result.ok) {
      setDraft(emptyStaffDraft);
      setStatus('success');
      onCreated?.();
      return;
    }

    setStatus('error');
    setMessage(result.message);
  };

  return (
    <Card as="section">
      <form className={styles.form} onSubmit={submit} noValidate>
        <h2 className={styles.title}>{texts.addTitle}</h2>
        <p className={styles.hint}>{texts.addHint}</p>

        <div className={styles.grid}>
          <Input
            label={texts.name}
            value={draft.name}
            disabled={sending}
            autoComplete="off"
            onChange={(event) => set({ name: event.target.value })}
          />
          <Input
            label={texts.login}
            hint={texts.loginHint}
            value={draft.login}
            disabled={sending}
            autoComplete="off"
            onChange={(event) => set({ login: event.target.value })}
          />
          <PhoneInput
            label={texts.phone}
            value={draft.phone}
            disabled={sending}
            onChange={(phone) => set({ phone })}
          />
          <Input
            label={texts.password}
            type="password"
            value={draft.password}
            disabled={sending}
            autoComplete="new-password"
            onChange={(event) => set({ password: event.target.value })}
          />
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={sending}>
            {sending ? texts.adding : texts.add}
          </Button>

          {status === 'success' ? <span className={styles.ok}>{texts.added}</span> : null}
        </div>

        {status === 'error' ? (
          <p className={styles.error} role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
