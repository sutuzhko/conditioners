'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Input,
  PasswordInput,
  PhoneInput,
  useConfirm,
} from '@/shared/ui';

import { ThemeChoice } from './ThemeChoice';
import { profileFormContent as texts } from './content';
import { profileApi } from './lib';
import type { ProfileApi, ProfileStatus, StaffCard } from './model';
import styles from './ProfileForm.module.css';

export interface ProfileFormProps {
  readonly me: StaffCard;
  readonly api?: ProfileApi | undefined;
}

/** Алгоритм хеширования пароля — техническая метка из макета, не данные компании. */
const PASSWORD_ALGORITHM = 'Argon2id';

/** Свой профиль: имя, телефон, пароль, тема и вход. */
export function ProfileForm({ me, api = profileApi }: ProfileFormProps) {
  const router = useRouter();

  const [name, setName] = useState(me.name ?? '');
  const [phone, setPhone] = useState(me.phone ?? '');
  const [status, setStatus] = useState<ProfileStatus>('idle');
  const [message, setMessage] = useState('');

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [passStatus, setPassStatus] = useState<ProfileStatus>('idle');
  const [passMessage, setPassMessage] = useState('');

  const [exitAllStatus, setExitAllStatus] = useState<ProfileStatus>('idle');
  const [exitAllMessage, setExitAllMessage] = useState('');

  /* Необратимое подтверждается диалогом кита, а не окном браузера (ADR-113). */
  const { confirm, dialog } = useConfirm();

  const sending = status === 'sending';
  const changing = passStatus === 'sending';
  const leavingAll = exitAllStatus === 'sending';

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

  /**
   * Совпадают ли новый пароль и его повтор.
   *
   * Пустой повтор промолчит: человек ещё не дошёл до второго поля, и красная
   * рамка на нём была бы упрёком за то, чего он не делал.
   */
  const checkRepeat = (): void => {
    setMismatch(repeat !== '' && next !== repeat);
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (changing) return;

    /* 🔴 Проверка до отправки: пароль набирают вслепую, и опечатка в новом
       означает потерю доступа — старый уже не подойдёт, а нового человек не
       знает. Сервер об этом не спрашивается: второе поле — про руки, а не
       про данные, и схема смены пароля лишнего ключа не принимает. */
    if (next !== repeat) {
      setMismatch(true);
      setPassStatus('idle');
      return;
    }

    setMismatch(false);
    setPassStatus('sending');
    setPassMessage('');

    const result = await api.changePassword({ current, next });

    if (result.ok) {
      setCurrent('');
      setNext('');
      setRepeat('');
      setPassStatus('success');
      return;
    }

    setPassStatus('error');
    setPassMessage(result.message);
  };

  const leaveEverywhere = async (): Promise<void> => {
    const confirmed = await confirm({
      title: texts.logoutAllConfirmTitle,
      description: texts.logoutAllConfirmText,
      confirmLabel: texts.logoutAllConfirm,
      cancelLabel: texts.logoutAllCancel,
    });

    if (!confirmed) return;

    setExitAllStatus('sending');
    setExitAllMessage('');

    const result = await api.logoutEverywhere();

    if (result.ok) {
      setExitAllStatus('success');
      return;
    }

    setExitAllStatus('error');
    setExitAllMessage(result.message);
  };

  return (
    <div className={styles.grid}>
      <div className={styles.column}>
        <Card as="section" padding="none">
          <form onSubmit={submit} noValidate>
            <CardHeader
              title={texts.personalTitle}
              as="h2"
              action={
                <Badge variant={me.role === 'owner' ? 'accent' : 'warning'}>
                  {texts.roleTitle(me.role)}
                </Badge>
              }
            />

            <CardBody className={styles.fields}>
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

              <PhoneInput
                label={texts.phone}
                value={phone}
                disabled={sending}
                onChange={(value) => {
                  setPhone(value);
                  setStatus('idle');
                }}
              />

              {/* Логин на чтение: его выдаёт владелец, и меняется он в разделе команды. */}
              <Input
                label={texts.login}
                value={me.login}
                readOnly
                className={styles.readonly}
                wrapperClassName={styles.wide}
              />

              {/* Оформление — тоже на чтение: от него зависит расчёт по нарядам,
                  и выбирать его себе человек не может (CRM.md §9). */}
              <Input
                label={texts.employment}
                hint={texts.employmentHint}
                value={texts.employmentValue(me.employment)}
                readOnly
                className={styles.readonly}
                wrapperClassName={styles.wide}
              />

              {status === 'error' ? (
                <p className={[styles.error, styles.wide].join(' ')} role="alert">
                  {message}
                </p>
              ) : null}
            </CardBody>

            <CardFooter align="between">
              <p className={styles.hint}>{texts.loginHint}</p>

              <div className={styles.actions}>
                {status === 'success' ? <span className={styles.ok}>{texts.saved}</span> : null}
                <Button type="submit" disabled={sending}>
                  {sending ? texts.saving : texts.save}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>

        <Card as="section" padding="none">
          <form onSubmit={changePassword} noValidate>
            <CardHeader
              title={texts.passwordTitle}
              subtitle={texts.passwordHint}
              as="h2"
              action={
                <Badge variant="neutral" mono>
                  {PASSWORD_ALGORITHM}
                </Badge>
              }
            />

            <CardBody className={styles.fields}>
              <PasswordInput
                label={texts.passwordCurrent}
                value={current}
                disabled={changing}
                autoComplete="current-password"
                wrapperClassName={styles.wide}
                onChange={(event) => {
                  setCurrent(event.target.value);
                  setPassStatus('idle');
                }}
              />

              <PasswordInput
                label={texts.passwordNext}
                value={next}
                disabled={changing}
                autoComplete="new-password"
                onChange={(event) => {
                  setNext(event.target.value);
                  setPassStatus('idle');
                  setMismatch(false);
                }}
                onBlur={checkRepeat}
              />

              <PasswordInput
                label={texts.passwordRepeat}
                value={repeat}
                disabled={changing}
                autoComplete="new-password"
                error={mismatch ? texts.passwordMismatch : undefined}
                onChange={(event) => {
                  setRepeat(event.target.value);
                  setPassStatus('idle');
                  setMismatch(false);
                }}
                onBlur={checkRepeat}
              />

              {passStatus === 'error' ? (
                <p className={[styles.error, styles.wide].join(' ')} role="alert">
                  {passMessage}
                </p>
              ) : null}
            </CardBody>

            <CardFooter>
              <div className={styles.actions}>
                {passStatus === 'success' ? (
                  <span className={styles.ok}>{texts.passwordDone}</span>
                ) : null}

                <Button type="submit" variant="flat" disabled={changing}>
                  {changing ? texts.passwordSending : texts.passwordSubmit}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>

      <div className={styles.column}>
        <Card as="section" padding="none">
          <CardHeader title={texts.themeTitle} subtitle={texts.themeHint} as="h2" />
          <CardBody>
            <ThemeChoice />
          </CardBody>
        </Card>

        {/* Вход стоит последним: порядок от общего к личному и дальше к
            необратимому (ADR-188). */}
        <Card as="section" padding="none">
          <CardHeader title={texts.signInTitle} as="h2" />

          <CardBody>
            {/* 🔴 Дата настоящая — из учётной записи. Выдуманное «сегодня,
                08:12» из макета здесь означало бы, что панель врёт про
                безопасность именно там, где её и проверяют. */}
            <dl className={styles.facts}>
              <dt className={styles.factTerm}>{texts.lastLogin}</dt>
              <dd className={styles.factValue}>{texts.lastLoginValue(me.lastLoginAt)}</dd>
            </dl>

            <p className={styles.hint}>{texts.logoutAllHint}</p>

            <div className={styles.exitRow}>
              <Button
                type="button"
                variant="danger"
                fullWidth
                loading={leavingAll}
                onClick={() => {
                  void leaveEverywhere();
                }}
              >
                {leavingAll ? texts.logoutAllSending : texts.logoutAll}
              </Button>

              {exitAllStatus === 'success' ? (
                <p className={styles.ok} role="status">
                  {texts.logoutAllDone}
                </p>
              ) : null}

              {exitAllStatus === 'error' ? (
                <p className={styles.error} role="alert">
                  {exitAllMessage}
                </p>
              ) : null}
            </div>
          </CardBody>

          {/* 🔴 Второй кнопки выхода в карточке нет (issue #753). Выход из
              панели один — пункт «Выйти» в меню учётной записи, тот самый,
              который владелец настраивал 4 сентября; здесь стояла своя,
              собранная из кита кнопка, и два выхода в одной панели выглядели
              по-разному. Артборд «Учётная запись» второй кнопки не рисует
              тоже: в карточке живёт только «Выйти на всех устройствах».
              Объяснение про восстановление пароля осталось — его больше
              сказать негде. */}
          <CardFooter align="start">
            <p className={styles.hint}>{texts.exitHint}</p>
          </CardFooter>
        </Card>
      </div>

      {/* Окно живёт вне карточек: подтверждение не принадлежит ни одной форме. */}
      {dialog}
    </div>
  );
}
