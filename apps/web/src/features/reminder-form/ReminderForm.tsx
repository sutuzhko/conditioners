'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { Button, Checkbox, Input, Select, type ButtonLinkHref } from '@/shared/ui';

import { WHEN_OPTIONS, reminderFormContent as texts } from './content';
import {
  HONEYPOT_FIELD,
  buildReminderFormData,
  emptyReminderValues,
  postReminder,
  validateReminderValues,
} from './lib';
import {
  REMINDER_FIELD_ORDER,
  type ReminderFieldErrors,
  type ReminderFormStatus,
  type ReminderFormValues,
  type ReminderSubmitResult,
} from './model';
import styles from './ReminderForm.module.css';

/** Отправка формы. Подменяется в историях и тестах. */
export type ReminderSubmit = (data: FormData) => Promise<ReminderSubmitResult>;

/** Срок по умолчанию — первый вариант списка: пустой выбор ничего не сообщает. */
const DEFAULT_WHEN = WHEN_OPTIONS[0]?.value ?? '';

export interface ReminderFormProps {
  /**
   * Адрес политики обработки персональных данных. Пропсом, а не литералом:
   * карта URL принадлежит странице.
   */
  policyHref: ButtonLinkHref;
  /**
   * Телефон компании — запасной путь, если отправка не удалась. Приходит из
   * настроек: в коде фактов о компании нет (инвариант 8). Не задан — строки с
   * телефоном не будет.
   */
  phone?: string | undefined;
  className?: string | undefined;
  submit?: ReminderSubmit | undefined;
}

/**
 * Короткая форма напоминания о сезонном ТО (макет, «Напоминание о ТО»).
 *
 * Устроена как остальные формы сайта: те же четыре состояния, та же ловушка,
 * то же согласие. 🔴 Согласия в макете нет, но телефон — персональные данные,
 * и без явной отметки форма не отправляется (инвариант 12); факт согласия
 * пишет сервер в `Lead.consentAt`.
 *
 * Обещание здесь ровно одно и выполнимое: напомнить перед сезоном. Сроков
 * выезда форма не называет — их подтверждать некому.
 */
export function ReminderForm({
  policyHref,
  phone,
  className,
  submit = postReminder,
}: ReminderFormProps) {
  const [values, setValues] = useState<ReminderFormValues>(() => emptyReminderValues(DEFAULT_WHEN));
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<ReminderFieldErrors>({});
  const [status, setStatus] = useState<ReminderFormStatus>('idle');
  const [failure, setFailure] = useState<string | undefined>(undefined);

  const formRef = useRef<HTMLFormElement>(null);
  const restarted = useRef(false);
  const honeypotId = useId();

  // после «добавить ещё один номер» фокус возвращается в поле телефона:
  // иначе он остаётся на исчезнувшей кнопке и уезжает в начало страницы
  useEffect(() => {
    if (!restarted.current) return;
    restarted.current = false;
    formRef.current?.querySelector<HTMLInputElement>('[name="phone"]')?.focus();
  }, [status]);

  function focusField(field: string): void {
    formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  }

  function changeValue(patch: Partial<ReminderFormValues>, field: keyof ReminderFormValues): void {
    setValues((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => {
      if (previous[field] === undefined) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function restart(): void {
    setValues(emptyReminderValues(DEFAULT_WHEN));
    setErrors({});
    setFailure(undefined);
    restarted.current = true;
    setStatus('idle');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (status === 'sending') return;

    /* 🔴 Ловушку заполняет только робот. Ведём себя как сервер: показываем
       обычный успех и ничего не отправляем — явный отказ подсказал бы автору
       спама, какое поле нужно оставить пустым. */
    if (honeypot !== '') {
      setStatus('success');
      return;
    }

    const found = validateReminderValues(values);
    setFailure(undefined);

    if (found !== null) {
      setErrors(found);
      setStatus('idle');
      const first = REMINDER_FIELD_ORDER.find((field) => found[field] !== undefined);
      if (first !== undefined) focusField(first);
      return;
    }

    setErrors({});
    setStatus('sending');

    const result = await submit(buildReminderFormData(values, honeypot));

    if (result.ok) {
      setStatus('success');
      return;
    }

    setFailure(result.message);
    setStatus('error');

    const field = REMINDER_FIELD_ORDER.find((known) => known === result.field);
    if (field !== undefined) {
      setErrors({ [field]: result.message });
      focusField(field);
    }
  }

  const announcement =
    status === 'sending'
      ? texts.sendingAnnounce
      : status === 'success'
        ? `${texts.successTitle} ${texts.successText}`
        : status === 'error' && failure !== undefined
          ? failure
          : '';

  if (status === 'success') {
    return (
      <div className={[styles.done, className].filter(Boolean).join(' ')}>
        <span className={styles.doneIcon} aria-hidden="true">
          <CheckIcon />
        </span>
        <div className={styles.doneText}>
          <p className={styles.doneTitle}>{texts.successTitle}</p>
          <p className={styles.doneNote}>{texts.successText}</p>
          <button type="button" className={styles.again} onClick={restart}>
            {texts.successAgain}
          </button>
        </div>
        <p className="srOnly" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      className={[styles.form, className].filter(Boolean).join(' ')}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      noValidate
    >
      {/* Итог отправки объявляется отсюда: область живёт в разметке всегда,
          иначе появление сообщения скринридер пропускает. */}
      <p className="srOnly" role="status" aria-live="polite">
        {announcement}
      </p>

      <Input
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        label={texts.phoneLabel}
        placeholder={texts.phonePlaceholder}
        value={values.phone}
        onChange={(event) => changeValue({ phone: event.target.value }, 'phone')}
        error={errors.phone}
        required
      />

      <Select
        name="when"
        label={texts.whenLabel}
        options={WHEN_OPTIONS}
        value={values.when}
        onChange={(event) => changeValue({ when: event.target.value }, 'when')}
        error={errors.when}
      />

      <Checkbox
        name="consent"
        label={
          <>
            {texts.consentLabel} —{' '}
            <Link href={policyHref} className={styles.policy}>
              {texts.consentPolicy}
            </Link>
          </>
        }
        checked={values.consent}
        onChange={(event) => changeValue({ consent: event.target.checked }, 'consent')}
        error={errors.consent}
        required
      />

      {status === 'error' && failure !== undefined ? (
        <p className={styles.error}>
          {failure}
          {phone === undefined || phone === '' ? null : (
            <span className={styles.errorCall}>{texts.errorCallUs(phone)}</span>
          )}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth disabled={status === 'sending'}>
        {status === 'sending' ? texts.submitting : texts.submit}
      </Button>

      {/* Поле-ловушка: человек его не видит и не наводит на него фокус. */}
      <div className={styles.trap} aria-hidden="true">
        <label htmlFor={honeypotId}>{texts.honeypotLabel}</label>
        <input
          id={honeypotId}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>
    </form>
  );
}

/** Галочка подтверждения — та же, что в макете: 30px, толщина 2.4. */
function CheckIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
