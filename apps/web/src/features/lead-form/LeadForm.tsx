'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { formatPhone, phoneHref } from '@/shared/lib/format';
import {
  Button,
  Card,
  Checkbox,
  FileInput,
  Icon,
  Input,
  PhoneInput,
  Select,
  Textarea,
  type ButtonLinkHref,
} from '@/shared/ui';

import {
  CALL_TIME_OPTIONS,
  DEFAULT_LEAD_TOPIC,
  LEAD_TOPICS,
  PLACE_OPTIONS,
  QTY_OPTIONS,
  leadFormContent as texts,
  type LeadTopic,
} from './content';
import { forgetLeadContext, useLeadContext } from './context';
import {
  HONEYPOT_FIELD,
  buildLeadFormData,
  describeLeadContext,
  emptyLeadValues,
  postLead,
  validateLeadValues,
} from './lib';
import {
  LEAD_FIELD_ORDER,
  type LeadFieldErrors,
  type LeadFormStatus,
  type LeadFormValues,
  type LeadSubmit,
} from './model';
import styles from './LeadForm.module.css';

const HEADINGS = { 2: 'h2', 3: 'h3', 4: 'h4' } as const;

/** Следующий уровень заголовка: подтверждение вложено в форму, а не равно ей. */
const NESTED: Record<2 | 3 | 4, 2 | 3 | 4> = { 2: 3, 3: 4, 4: 4 };

export interface LeadFormProps {
  /**
   * 🔴 Запасной путь: если отправка не удалась, человек не должен остаться ни с
   * чем. Телефон приходит из настроек компании, в коде его нет (инвариант 8).
   */
  phone: string;
  /**
   * Адрес политики обработки персональных данных. Пропсом, а не литералом:
   * карта URL принадлежит странице, а `typedRoutes` не соберёт ссылку на
   * маршрут, которого ещё нет.
   */
  policyHref: ButtonLinkHref;
  /** Заголовок над формой. Разный на главной и на страницах кластера. */
  title?: string | undefined;
  description?: string | undefined;
  /** Уровень заголовка: на странице уже есть свой `h1` (инвариант 4). */
  headingLevel?: 2 | 3 | 4 | undefined;
  /** Тема обращения, выбранная заранее: на странице ремонта это «Сервис и ремонт». */
  defaultTopic?: LeadTopic | undefined;
  className?: string | undefined;
  /** Отправка. Подменяется в историях и тестах; по умолчанию — `POST /api/leads`. */
  submit?: LeadSubmit | undefined;
  onSuccess?: ((leadId: string) => void) | undefined;
}

/**
 * Форма заявки — продукт проекта. Всё остальное на сайте существует ради того,
 * чтобы человек дошёл до неё, поэтому здесь разобраны все четыре состояния, а у
 * ошибки всегда есть запасной путь — телефон.
 */
export function LeadForm({
  phone,
  policyHref,
  title,
  description,
  headingLevel = 2,
  defaultTopic = DEFAULT_LEAD_TOPIC,
  className,
  submit = postLead,
  onSuccess,
}: LeadFormProps) {
  const [values, setValues] = useState<LeadFormValues>(() => emptyLeadValues(defaultTopic));
  const [photo, setPhoto] = useState<File | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<LeadFieldErrors>({});
  const [status, setStatus] = useState<LeadFormStatus>('idle');
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [greeting, setGreeting] = useState('');
  /* Контекст сняли руками: панель исчезла, и без этой отметки исчезновение
     выглядело бы сбоем, а не ответом на нажатие. */
  const [contextDropped, setContextDropped] = useState(false);

  /* Что человек успел посчитать и отметить до формы. Приходит из лёгкого
     клиентского хранилища (`./context`), а не пропсом: калькулятор и подбор
     живут в других секциях страницы, и общего родителя у них нет. */
  const context = useLeadContext();
  const contextEntries = describeLeadContext(context);

  const formRef = useRef<HTMLFormElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const restarted = useRef(false);
  const headingId = useId();
  const honeypotId = useId();
  const contextId = useId();

  const Heading = HEADINGS[headingLevel];
  const SuccessHeading = HEADINGS[title === undefined ? headingLevel : NESTED[headingLevel]];
  const readablePhone = formatPhone(phone);

  // после «Отправить ещё одну» фокус возвращается в первое поле:
  // иначе он остаётся на исчезнувшей кнопке и уезжает в начало страницы
  useEffect(() => {
    if (!restarted.current) return;
    restarted.current = false;
    formRef.current?.querySelector<HTMLInputElement>('[name="name"]')?.focus();
  }, [status]);

  // экран успеха замещает форму вместе с кнопкой отправки, и фокус повисал бы
  // на body: переводим его на заголовок подтверждения — клавиатура продолжает
  // путь с него, а читалка объявляет итог, а не тишину
  useEffect(() => {
    if (status !== 'success') return;
    successHeadingRef.current?.focus();
  }, [status]);

  function focusField(field: string): void {
    formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  }

  function changeValue(patch: Partial<LeadFormValues>, field: keyof LeadFormValues): void {
    setValues((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => {
      if (previous[field] === undefined) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  /** «Не прикреплять»: снимок уходит из вкладки целиком, а не прячется. */
  function dropContext(): void {
    forgetLeadContext();
    setContextDropped(true);
  }

  function restart(): void {
    setValues(emptyLeadValues(defaultTopic));
    setPhoto(null);
    setErrors({});
    setFailure(undefined);
    restarted.current = true;
    setStatus('idle');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (status === 'sending') return;

    // 🔴 Ловушку заполняет только робот. Ведём себя как сервер: показываем
    // обычный успех и ничего не отправляем — явный отказ подсказал бы автору
    // спама, какое поле нужно оставить пустым.
    if (honeypot !== '') {
      setGreeting(values.name.trim());
      setStatus('success');
      return;
    }

    const found = validateLeadValues(values);
    setFailure(undefined);

    if (found !== null) {
      setErrors(found);
      setStatus('idle');
      const first = LEAD_FIELD_ORDER.find((field) => found[field] !== undefined);
      if (first !== undefined) focusField(first);
      return;
    }

    setErrors({});
    setStatus('sending');

    const result = await submit(buildLeadFormData(values, photo, honeypot, context));

    if (result.ok) {
      setGreeting(values.name.trim());
      setStatus('success');
      /* Снимок уехал с заявкой и своё отработал. Оставить его во вкладке —
         значит приложить вчерашний расчёт к завтрашнему обращению. */
      forgetLeadContext();
      onSuccess?.(result.id);
      return;
    }

    setFailure(result.message);
    setStatus('error');

    const field = LEAD_FIELD_ORDER.find((known) => known === result.field);
    if (field !== undefined) {
      setErrors({ [field]: result.message });
      focusField(field);
    }
  }

  const announcement =
    status === 'sending'
      ? texts.sendingAnnounce
      : status === 'success'
        ? texts.successAnnounce
        : status === 'error' && failure !== undefined
          ? // пока телефон компании не заполнен, запасного пути нет — и звать
            // «позвоните нам» с пустым номером нельзя ни на экране, ни вслух
            phone === ''
            ? failure
            : `${failure}. ${texts.errorFallbackLead} ${readablePhone}`
          : '';

  return (
    <Card
      variant="default"
      padding="xl"
      radius="xl"
      bordered={false}
      elevation="float"
      className={[styles.card, className].filter(Boolean).join(' ')}
    >
      {title === undefined ? null : (
        <header className={styles.header}>
          <Heading className={styles.title} id={headingId}>
            {title}
          </Heading>
          {description === undefined ? null : <p className={styles.description}>{description}</p>}
        </header>
      )}

      {/* Итог отправки объявляется отсюда: область живёт в разметке всегда,
          иначе часть скринридеров не заметит её появления */}
      <p className="srOnly" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {status === 'success' ? (
        <div className={styles.success}>
          <span className={styles.successIcon} aria-hidden="true">
            <Icon name="check" size={38} />
          </span>
          {/* tabIndex={-1}: заголовок принимает фокус программно, но не встаёт
              лишней остановкой в обычный ход Tab */}
          <SuccessHeading ref={successHeadingRef} tabIndex={-1} className={styles.successTitle}>
            {texts.successTitle}
          </SuccessHeading>
          <p className={styles.successText}>{texts.successThanks(greeting)}</p>
          <p className={styles.successText}>{texts.successNext}</p>
          <Button variant="secondary" size="md" onClick={restart}>
            {texts.successAgain}
          </Button>
        </div>
      ) : (
        /* noValidate: проверку ведёт Zod той же схемой, что и сервер. Иначе
           браузер перехватит отправку и покажет свою подсказку — чужим тоном
           и не всегда по-русски */
        <form
          ref={formRef}
          className={styles.form}
          noValidate
          onSubmit={(event) => void handleSubmit(event)}
          aria-labelledby={title === undefined ? undefined : headingId}
          aria-label={title === undefined ? texts.formLabel : undefined}
        >
          <p className={styles.note}>{texts.requiredNote}</p>

          <div className={styles.pair}>
            <Input
              name="name"
              label={texts.nameLabel}
              placeholder={texts.namePlaceholder}
              autoComplete="name"
              required
              value={values.name}
              error={errors.name}
              onChange={(event) => changeValue({ name: event.target.value }, 'name')}
            />
            <PhoneInput
              name="phone"
              label={texts.phoneLabel}
              required
              value={values.phone}
              error={errors.phone}
              onChange={(phone) => changeValue({ phone }, 'phone')}
            />
          </div>

          <div className={styles.pair}>
            <Select
              name="topic"
              label={texts.topicLabel}
              options={LEAD_TOPICS}
              value={values.topic}
              error={errors.topic}
              onChange={(event) => changeValue({ topic: event.target.value }, 'topic')}
            />
            <Select
              name="place"
              label={texts.placeLabel}
              options={PLACE_OPTIONS}
              value={values.place}
              error={errors.place}
              onChange={(event) => changeValue({ place: event.target.value }, 'place')}
            />
          </div>

          <Input
            name="address"
            label={texts.addressLabel}
            placeholder={texts.addressPlaceholder}
            autoComplete="street-address"
            value={values.address}
            error={errors.address}
            onChange={(event) => changeValue({ address: event.target.value }, 'address')}
          />

          <div className={styles.pair}>
            <Select
              name="qty"
              label={texts.qtyLabel}
              options={QTY_OPTIONS}
              value={values.qty}
              error={errors.qty}
              onChange={(event) => changeValue({ qty: event.target.value }, 'qty')}
            />
            <Select
              name="callTime"
              label={texts.callTimeLabel}
              options={CALL_TIME_OPTIONS}
              value={values.callTime}
              error={errors.callTime}
              onChange={(event) => changeValue({ callTime: event.target.value }, 'callTime')}
            />
          </div>

          <Textarea
            name="comment"
            label={texts.commentLabel}
            placeholder={texts.commentPlaceholder}
            rows={3}
            value={values.comment}
            error={errors.comment}
            onChange={(event) => changeValue({ comment: event.target.value }, 'comment')}
          />

          <FileInput
            name="photo"
            label={texts.photoLabel}
            hint={texts.photoHint}
            value={photo}
            onChange={setPhoto}
          />

          <Checkbox
            name="consent"
            required
            checked={values.consent}
            error={errors.consent}
            onChange={(event) => changeValue({ consent: event.target.checked }, 'consent')}
            label={
              <>
                {texts.consentLabel}
                {' — '}
                {/* 🔴 Отдельная вкладка: политику открывают из формы, наполовину
                    заполненной, и уход со страницы стирает введённое.
                    `rel` обязателен вместе с `target` — без него открытая
                    страница получает доступ к окну-источнику. */}
                <Link href={policyHref} className={styles.policy} target="_blank" rel="noreferrer">
                  {texts.consentPolicy}
                </Link>
              </>
            }
          />

          {/* Группа, а не landmark: это небольшая справка внутри формы, а
              ориентир страницы — сама форма. Подпись связана явно, чтобы
              кнопка отказа читалась вместе с тем, от чего отказываются. */}
          {contextEntries.length > 0 ? (
            <div className={styles.context} role="group" aria-labelledby={contextId}>
              <p className={styles.contextTitle} id={contextId}>
                {texts.contextTitle}
              </p>
              <dl className={styles.contextList}>
                {contextEntries.map((entry) => (
                  <div className={styles.contextRow} key={entry.label}>
                    <dt className={styles.contextLabel}>{entry.label}</dt>
                    <dd className={styles.contextValue}>{entry.value}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.contextHint}>{texts.contextHint}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={styles.contextDrop}
                onClick={dropContext}
              >
                {texts.contextDrop}
              </Button>
            </div>
          ) : contextDropped ? (
            <p className={styles.contextNote} role="status">
              {texts.contextDropped}
            </p>
          ) : null}

          {/* Поле-ловушка: человек его не видит и не может на него попасть —
              ни мышью, ни табуляцией, ни скринридером. Робот заполняет всё */}
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

          {status === 'error' && failure !== undefined ? (
            <div className={styles.failure}>
              <p className={styles.failureText}>{failure}</p>
              {/* нет телефона в настройках — нет и приглашения позвонить:
                  пустая ссылка tel: хуже отсутствия запасного пути */}
              {phone === '' ? null : (
                <p className={styles.failureText}>
                  {texts.errorFallbackLead}{' '}
                  <a className={styles.failurePhone} href={phoneHref(phone)}>
                    {readablePhone}
                  </a>
                </p>
              )}
            </div>
          ) : null}

          <Button type="submit" size="lg" fullWidth loading={status === 'sending'}>
            {status === 'sending' ? texts.submitting : texts.submit}
          </Button>
        </form>
      )}
    </Card>
  );
}
