'use client';

import { useState, type FormEvent } from 'react';

import { Button, Input, PhoneInput, Select } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import { staffApi } from './lib';
import {
  emptyStaffDraft,
  isEmployment,
  isSelfEmployedWithoutInn,
  type StaffApi,
  type StaffDraft,
  type StaffStatus,
} from './model';
import styles from './StaffForm.module.css';

export interface StaffCreateFormProps {
  /** Действия раздела. Подменяются в историях и тестах, чтобы не поднимать сеть. */
  readonly api?: StaffApi | undefined;
  readonly onCreated?: (() => void) | undefined;
}

/**
 * Заведение монтажника: имя, логин, телефон, оформление и временный пароль.
 *
 * Оформление можно не выбирать: человека заводят по телефону, а договор
 * подписывают позже. Обязательное поле здесь означало бы выбранное наугад —
 * а от него зависят деньги в наряде.
 */
export function StaffCreateForm({ api = staffApi, onCreated }: StaffCreateFormProps) {
  const [draft, setDraft] = useState<StaffDraft>(emptyStaffDraft);
  const [status, setStatus] = useState<StaffStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);

  const sending = status === 'sending';

  const set = (patch: Partial<StaffDraft>): void => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setStatus('idle');
    setFieldError((prev) => (prev !== null && prev.field in patch ? null : prev));
  };

  const errorFor = (field: keyof StaffDraft): string | undefined =>
    fieldError?.field === field ? fieldError.message : undefined;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    setStatus('sending');
    setMessage('');
    setFieldError(null);

    const result = await api.create(draft);

    if (result.ok) {
      setDraft(emptyStaffDraft);
      setStatus('success');
      onCreated?.();
      return;
    }

    setStatus('error');
    /* Отказ с названием поля подсвечивает поле: «Такой логин уже занят» без
       подсветки заставляет перечитывать форму сверху. */
    if (result.field === undefined) setMessage(result.message);
    else setFieldError({ field: result.field, message: result.message });
  };

  /* Ни заголовка, ни рамки форма не рисует: их даёт то, во что она вставлена —
     окно создания или карточка страницы за тем же адресом (ADR-117). Свой
     заголовок внутри окна был бы вторым заголовком того же самого. */
  return (
    <form className={styles.form} onSubmit={submit} noValidate>
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
          label={texts.password}
          type="password"
          value={draft.password}
          disabled={sending}
          error={errorFor('password')}
          autoComplete="new-password"
          onChange={(event) => set({ password: event.target.value })}
        />

        {/* Цифровая клавиатура на телефоне: ИНН диктуют, а вводят с него. */}
        <Input
          label={texts.inn}
          hint={texts.innHint}
          value={draft.inn}
          disabled={sending}
          error={errorFor('inn')}
          inputMode="numeric"
          autoComplete="off"
          onChange={(event) => set({ inn: event.target.value })}
        />

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

      {/* 🔴 Предупреждение, а не запрет: сохранение не блокируется. Без ИНН
            статус самозанятого не проверить, а слетевший статус означает
            доначисления владельцу (PROJECT §5.4). */}
      {isSelfEmployedWithoutInn(draft.employment === '' ? null : draft.employment, draft.inn) ? (
        <p className={styles.notice}>{texts.innMissing}</p>
      ) : null}

      <div className={styles.actions}>
        <Button type="submit" disabled={sending}>
          {sending ? texts.adding : texts.add}
        </Button>

        {status === 'success' ? <span className={styles.ok}>{texts.added}</span> : null}
      </div>

      {/* Адресный отказ уже подсвечен на поле — второй красной плашки под
            формой быть не должно. */}
      {status === 'error' && message !== '' ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
