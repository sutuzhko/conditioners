'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Card, Input, PhoneInput, Select, useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import { staffApi } from './lib';
import {
  isEmployment,
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
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

/**
 * Аккаунт монтажника: имя, логин, телефон, пароль и доступ.
 *
 * Пустое поле пароля означает «оставить прежним» — заполнять его при каждой
 * правке телефона было бы приглашением придумать пароль попроще.
 */
export function StaffAccountForm({ staff, api = staffApi, confirmRemove }: StaffAccountFormProps) {
  /* Подтверждение — общий диалог кита (ADR-113); проп остаётся швом
     для тестов, чтобы не открывать окно ради проверки удаления. */
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const router = useRouter();
  const [draft, setDraft] = useState<StaffAccountDraft>({
    name: staff.name ?? '',
    login: staff.login,
    phone: staff.phone ?? '',
    /* `null` из карточки — «не заведено»; в `select` это пустое значение. */
    employment: staff.employment ?? '',
    password: '',
  });
  const [status, setStatus] = useState<StaffStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);

  const sending = status === 'sending';

  const set = (patch: Partial<StaffAccountDraft>): void => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setStatus('idle');
    /* Поправили то самое поле — подсветка уходит, не дожидаясь отправки. */
    setFieldError((prev) => (prev !== null && prev.field in patch ? null : prev));
  };

  const errorFor = (field: keyof StaffAccountDraft): string | undefined =>
    fieldError?.field === field ? fieldError.message : undefined;

  const run = async (
    action: () => Promise<{ ok: boolean; message?: string; field?: string }>,
  ): Promise<boolean> => {
    setStatus('sending');
    setMessage('');
    setFieldError(null);

    const result = await action();

    if (result.ok) {
      setStatus('success');
      router.refresh();
      return true;
    }

    setStatus('error');
    const text = result.message ?? texts.serverError;

    /* Адресный отказ («логин занят») подсвечивает поле: без этого человек
       читает сообщение и гадает, какое из пяти полей чинить. */
    if (result.field === undefined) setMessage(text);
    else setFieldError({ field: result.field, message: text });

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
        employment: draft.employment,
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
            error={errorFor('name')}
            autoComplete="off"
            onChange={(event) => set({ name: event.target.value })}
          />
          <Input
            label={texts.login}
            hint={texts.loginHint}
            value={draft.login}
            disabled={sending}
            error={errorFor('login')}
            autoComplete="off"
            onChange={(event) => set({ login: event.target.value })}
          />
          <PhoneInput
            label={texts.phone}
            value={draft.phone}
            disabled={sending}
            error={errorFor('phone')}
            onChange={(phone) => set({ phone })}
          />
          <Input
            label={texts.passwordNew}
            hint={texts.passwordKeepHint}
            type="password"
            value={draft.password}
            disabled={sending}
            error={errorFor('password')}
            autoComplete="new-password"
            onChange={(event) => set({ password: event.target.value })}
          />

          {/* Оформление — условие расчётов по нарядам, поэтому подсказка под
              выбором говорит о деньгах, а не о самом словаре. */}
          <Select
            label={texts.employment}
            options={texts.employmentOptions}
            value={draft.employment}
            hint={texts.employmentHint(draft.employment === '' ? null : draft.employment)}
            disabled={sending}
            error={errorFor('employment')}
            wrapperClassName={styles.wide}
            onChange={(event) => {
              const value = event.target.value;
              set({ employment: isEmployment(value) ? value : '' });
            }}
          />
        </div>

        <p className={styles.hint}>{texts.employmentNote}</p>

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
              void (async () => {
                if (!(await ask(texts.removeConfirm(staffTitle(staff))))) return;
                await run(async () => {
                  const result = await api.remove(staff.id);
                  if (result.ok) router.push('/admin/team');
                  return result;
                });
              })();
            }}
          >
            {texts.remove}
          </Button>

          {status === 'success' ? <span className={styles.ok}>{texts.saved}</span> : null}
        </div>

        <p className={styles.hint}>{texts.disableHint}</p>

        {/* Адресный отказ уже подсвечен на поле — второй красной плашки под
            формой быть не должно. */}
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
