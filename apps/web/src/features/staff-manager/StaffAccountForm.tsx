'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Card, Input, PhoneInput } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import { staffApi } from './lib';
import {
  staffTitle,
  type StaffAccountDraft,
  type StaffApi,
  type StaffCard,
  type StaffStatus,
} from './model';
import styles from './StaffForm.module.css';

export interface StaffAccountFormProps {
  readonly staff: StaffCard;
  readonly api?: StaffApi | undefined;
  readonly confirmRemove?: ((message: string) => boolean) | undefined;
}

/**
 * Аккаунт монтажника: имя, логин, телефон, пароль и доступ.
 *
 * Пустое поле пароля означает «оставить прежним» — заполнять его при каждой
 * правке телефона было бы приглашением придумать пароль попроще.
 */
export function StaffAccountForm({
  staff,
  api = staffApi,
  confirmRemove = (message) => window.confirm(message),
}: StaffAccountFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<StaffAccountDraft>({
    name: staff.name ?? '',
    login: staff.login,
    phone: staff.phone ?? '',
    password: '',
  });
  const [status, setStatus] = useState<StaffStatus>('idle');
  const [message, setMessage] = useState('');

  const sending = status === 'sending';

  const set = (patch: Partial<StaffAccountDraft>): void => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setStatus('idle');
  };

  const run = async (
    action: () => Promise<{ ok: boolean; message?: string }>,
  ): Promise<boolean> => {
    setStatus('sending');
    setMessage('');

    const result = await action();

    if (result.ok) {
      setStatus('success');
      router.refresh();
      return true;
    }

    setStatus('error');
    setMessage(result.message ?? texts.serverError);
    return false;
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    const saved = await run(() =>
      api.update(staff.id, {
        name: draft.name,
        login: draft.login,
        phone: draft.phone,
        /* Пустое поле — «не менять»: отправлять пустую строку значит стереть
           человеку пароль и запереть его снаружи. */
        ...(draft.password === '' ? {} : { password: draft.password }),
      }),
    );

    if (saved) setDraft((prev) => ({ ...prev, password: '' }));
  };

  return (
    <Card as="section">
      <form className={styles.form} onSubmit={submit} noValidate>
        <h2 className={styles.title}>{texts.accountTitle}</h2>
        <p className={styles.hint}>{texts.accountHint}</p>

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
            label={texts.passwordNew}
            hint={texts.passwordKeepHint}
            type="password"
            value={draft.password}
            disabled={sending}
            autoComplete="new-password"
            onChange={(event) => set({ password: event.target.value })}
          />
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={sending}>
            {sending ? texts.saving : texts.save}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={sending}
            onClick={() => void run(() => api.update(staff.id, { active: !staff.active }))}
          >
            {staff.active ? texts.disable : texts.enable}
          </Button>

          <span className={styles.spacer} />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={sending}
            onClick={() => {
              if (!confirmRemove(texts.removeConfirm(staffTitle(staff)))) return;
              void run(async () => {
                const result = await api.remove(staff.id);
                if (result.ok) router.push('/admin/team');
                return result;
              });
            }}
          >
            {texts.remove}
          </Button>

          {status === 'success' ? <span className={styles.ok}>{texts.saved}</span> : null}
        </div>

        <p className={styles.hint}>{texts.disableHint}</p>

        {status === 'error' ? (
          <p className={styles.error} role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
