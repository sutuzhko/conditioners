'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { Button, Card, Input } from '@/shared/ui';

import { adminLoginContent as texts } from './content';
import { emptyLoginValues, postLogin, validateLoginValues } from './lib';
import {
  LOGIN_FIELD_ORDER,
  type LoginFieldErrors,
  type LoginStatus,
  type LoginSubmit,
  type LoginValues,
} from './model';
import styles from './LoginForm.module.css';

export interface LoginFormProps {
  /**
   * Куда вернуть после входа. Приходит из middleware в `?next=`, поэтому
   * пропсом: страница знает адрес, форма — нет.
   */
  redirectTo: string;
  /** Отправка. Подменяется в историях и тестах; по умолчанию — POST /api/auth/login. */
  submit?: LoginSubmit | undefined;
  /**
   * Переход после входа. Подменяется в историях и тестах.
   *
   * Полным запросом, а не маршрутизатором: сессия только что появилась, и
   * каждый серверный компонент панели должен прочитать её заново. Заодно
   * снимается вопрос типов — `typedRoutes` не принимает адрес, собранный из
   * строки запроса, а приведение типа на этом проекте запрещено.
   */
  navigate?: ((url: string) => void) | undefined;
}

/**
 * Форма входа в панель управления.
 *
 * Состояния из docs/CLAUDE.md: `idle`, `sending`, `error`. Состояния `success`
 * здесь нет намеренно — после удачного входа показывать нечего, страница
 * сразу уходит на запрошенный раздел.
 */
export function LoginForm({
  redirectTo,
  submit = postLogin,
  navigate = (url) => {
    window.location.assign(url);
  },
}: LoginFormProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState<LoginValues>(emptyLoginValues);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [message, setMessage] = useState('');

  /* Фокус на пароль возвращаем после перерисовки, а не сразу в обработчике:
     на время отправки поле заблокировано, а заблокированный input фокус не
     принимает — и человек оставался ни с чем после отказа. */
  useEffect(() => {
    if (status !== 'error') return;
    formRef.current?.querySelector<HTMLInputElement>('[name="password"]')?.focus();
  }, [status, message]);

  const change = (field: keyof LoginValues) => (event: { target: { value: string } }) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    /* Ошибку поля снимаем на первом же вводе: держать её, пока человек
       исправляет, — значит ругаться на то, что он уже чинит. */
    setFieldErrors((prev) => (prev[field] === undefined ? prev : { ...prev, [field]: undefined }));
  };

  /** Фокус на первое непройденное поле: иначе ошибка внизу остаётся незамеченной. */
  const focusFirstError = (errors: LoginFieldErrors): void => {
    const field = LOGIN_FIELD_ORDER.find((name) => errors[name] !== undefined);
    if (field === undefined) return;
    formRef.current?.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (status === 'sending') return;

    const errors = validateLoginValues(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstError(errors);
      return;
    }

    setStatus('sending');
    setMessage('');

    const result = await submit(values);

    if (result.ok) {
      navigate(redirectTo);
      return;
    }

    setStatus('error');
    setMessage(result.message);
    setValues((prev) => ({ ...prev, password: '' }));
  };

  const sending = status === 'sending';

  return (
    <Card
      as="section"
      elevation="raised"
      className={styles.card}
      aria-labelledby={`${formId}-title`}
    >
      <h1 className={styles.title} id={`${formId}-title`}>
        {texts.title}
      </h1>
      <p className={styles.description}>{texts.description}</p>

      <form className={styles.form} ref={formRef} onSubmit={handleSubmit} noValidate>
        <Input
          name="login"
          label={texts.login}
          autoComplete="username"
          autoFocus
          required
          value={values.login}
          error={fieldErrors.login}
          disabled={sending}
          onChange={change('login')}
        />

        <Input
          name="password"
          type="password"
          label={texts.password}
          autoComplete="current-password"
          required
          value={values.password}
          error={fieldErrors.password}
          disabled={sending}
          onChange={change('password')}
        />

        {/* role="alert" озвучивает ответ сервера сразу: без него человек с
            экранным диктором нажимает «Войти» и не узнаёт результата. */}
        {message === '' ? null : (
          <p className={styles.error} role="alert">
            {message}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={sending}>
          {sending ? texts.sending : texts.submit}
        </Button>
      </form>
    </Card>
  );
}
