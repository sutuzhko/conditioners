'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Badge, Button, Card, Input, PhoneInput } from '@/shared/ui';

import { ProfileExit } from './ProfileExit';
import { ThemeChoice } from './ThemeChoice';
import { profileFormContent as texts } from './content';
import { profileApi } from './lib';
import type { ProfileApi, ProfileStatus, StaffCard } from './model';
import styles from './ProfileForm.module.css';

export interface ProfileFormProps {
  readonly me: StaffCard;
  readonly api?: ProfileApi | undefined;
}

/** Свой профиль: имя, телефон, пароль и тема. */
export function ProfileForm({ me, api = profileApi }: ProfileFormProps) {
  const router = useRouter();

  const [name, setName] = useState(me.name ?? '');
  const [phone, setPhone] = useState(me.phone ?? '');
  const [status, setStatus] = useState<ProfileStatus>('idle');
  const [message, setMessage] = useState('');

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [passStatus, setPassStatus] = useState<ProfileStatus>('idle');
  const [passMessage, setPassMessage] = useState('');

  const sending = status === 'sending';
  const changing = passStatus === 'sending';

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    setStatus('sending');
    setMessage('');

    const result = await api.save({ name, phone });

    if (result.ok) {
      setStatus('success');
      /* Имя показывается в шапке панели — она перерисуется вместе со страницей. */
      router.refresh();
      return;
    }

    setStatus('error');
    setMessage(result.message);
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (changing) return;

    setPassStatus('sending');
    setPassMessage('');

    const result = await api.changePassword({ current, next });

    if (result.ok) {
      setCurrent('');
      setNext('');
      setPassStatus('success');
      return;
    }

    setPassStatus('error');
    setPassMessage(result.message);
  };

  return (
    <div className={styles.grid}>
      <Card as="section">
        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.head}>
            <h2 className={styles.title}>{texts.personalTitle}</h2>
            <Badge variant={me.role === 'owner' ? 'accent' : 'warning'}>
              {texts.roleTitle(me.role)}
            </Badge>
          </div>

          <Input
            label={texts.name}
            value={name}
            disabled={sending}
            autoComplete="name"
            onChange={(event) => {
              setName(event.target.value);
              setStatus('idle');
            }}
          />

          {/* Логин на чтение: его выдаёт владелец, и меняется он в разделе команды. */}
          <Input label={texts.login} value={me.login} readOnly className={styles.readonly} />

          {/* Оформление — тоже на чтение: от него зависит расчёт по нарядам,
              и выбирать его себе человек не может (CRM.md §9). */}
          <Input
            label={texts.employment}
            hint={texts.employmentHint}
            value={texts.employmentValue(me.employment)}
            readOnly
            className={styles.readonly}
          />

          <PhoneInput
            label={texts.phone}
            value={phone}
            disabled={sending}
            onChange={(next) => {
              setPhone(next);
              setStatus('idle');
            }}
          />

          <div className={styles.actions}>
            <Button type="submit" disabled={sending}>
              {sending ? texts.saving : texts.save}
            </Button>
            {status === 'success' ? <span className={styles.ok}>{texts.saved}</span> : null}
          </div>

          {status === 'error' ? (
            <p className={styles.error} role="alert">
              {message}
            </p>
          ) : null}
        </form>
      </Card>

      <div className={styles.column}>
        <Card as="section">
          <form className={styles.form} onSubmit={changePassword} noValidate>
            <h2 className={styles.title}>{texts.passwordTitle}</h2>
            <p className={styles.hint}>{texts.passwordHint}</p>

            <Input
              label={texts.passwordCurrent}
              type="password"
              value={current}
              disabled={changing}
              autoComplete="current-password"
              onChange={(event) => {
                setCurrent(event.target.value);
                setPassStatus('idle');
              }}
            />
            <Input
              label={texts.passwordNext}
              type="password"
              value={next}
              disabled={changing}
              autoComplete="new-password"
              onChange={(event) => {
                setNext(event.target.value);
                setPassStatus('idle');
              }}
            />

            <div className={styles.actions}>
              <Button type="submit" variant="bordered" disabled={changing}>
                {changing ? texts.passwordSending : texts.passwordSubmit}
              </Button>
              {passStatus === 'success' ? (
                <span className={styles.ok}>{texts.passwordDone}</span>
              ) : null}
            </div>

            {passStatus === 'error' ? (
              <p className={styles.error} role="alert">
                {passMessage}
              </p>
            ) : null}
          </form>
        </Card>

        <Card as="section">
          <h2 className={styles.title}>{texts.themeTitle}</h2>
          <p className={styles.hint}>{texts.themeHint}</p>
          <ThemeChoice />
        </Card>

        {/* Выход есть у обеих ролей и стоит последним: порядок от общего к
            личному и дальше к необратимому (ADR-188). */}
        <Card as="section">
          <h2 className={styles.title}>{texts.exitTitle}</h2>
          <p className={styles.hint}>{texts.exitHint}</p>
          <ProfileExit />
        </Card>
      </div>
    </div>
  );
}
