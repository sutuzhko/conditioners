'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import {
  Button,
  Card,
  Checkbox,
  FileInput,
  Icon,
  Input,
  Rating,
  Textarea,
  type ButtonLinkHref,
} from '@/shared/ui';

import {
  HONEYPOT_FIELD,
  buildReviewFormData,
  emptyReviewValues,
  postReview,
  validateReviewValues,
} from './lib';
import {
  REVIEW_FIELD_ORDER,
  type ReviewFieldErrors,
  type ReviewFormStatus,
  type ReviewFormValues,
  type ReviewSubmit,
} from './model';
import { reviewFormContent as texts } from './content';
import styles from './ReviewForm.module.css';

const HEADINGS = { 2: 'h2', 3: 'h3', 4: 'h4' } as const;

/** Следующий уровень заголовка: подтверждение вложено в форму, а не равно ей. */
const NESTED: Record<2 | 3 | 4, 2 | 3 | 4> = { 2: 3, 3: 4, 4: 4 };

export interface ReviewFormProps {
  /**
   * Адрес политики обработки персональных данных. Пропсом, а не литералом:
   * карта URL принадлежит странице, а `typedRoutes` не соберёт ссылку на
   * маршрут, которого ещё нет.
   */
  policyHref: ButtonLinkHref;
  /**
   * Заголовок над формой и подпись под ним. Значения по умолчанию описывают
   * саму форму, поэтому страница задаёт их, только если ведёт свой разговор.
   */
  title?: string | undefined;
  description?: string | undefined;
  /** Уровень заголовка: на странице уже есть свой `h1` (инвариант 4). */
  headingLevel?: 2 | 3 | 4 | undefined;
  /** Якорь: на форму ведут ссылки «Оставить отзыв» из пустого состояния секции. */
  id?: string | undefined;
  className?: string | undefined;
  /** Отправка. Подменяется в историях и тестах; по умолчанию — `POST /api/reviews`. */
  submit?: ReviewSubmit | undefined;
  onSuccess?: ((reviewId: string) => void) | undefined;
}

/**
 * Форма отзыва. Устроена как форма заявки — те же четыре состояния, та же
 * обработка ошибок сервера, то же согласие и та же ловушка: две формы на одном
 * сайте не имеют права вести себя по-разному.
 *
 * Отличий два, и оба вынужденные. 🔴 Успех говорит про модерацию, а не про
 * публикацию: отзыв уходит со статусом `pending`. И запасного пути через
 * телефон здесь нет — отзыв не диктуют голосом, поэтому при ошибке форма
 * сохраняет написанное и предлагает повторить.
 */
export function ReviewForm({
  policyHref,
  title = texts.title,
  description = texts.description,
  headingLevel = 2,
  id,
  className,
  submit = postReview,
  onSuccess,
}: ReviewFormProps) {
  const [values, setValues] = useState<ReviewFormValues>(emptyReviewValues);
  const [photo, setPhoto] = useState<File | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<ReviewFieldErrors>({});
  const [status, setStatus] = useState<ReviewFormStatus>('idle');
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [greeting, setGreeting] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  const restarted = useRef(false);
  const headingId = useId();
  const honeypotId = useId();

  const Heading = HEADINGS[headingLevel];
  // подтверждение вложено в форму, а не равно ей: уровнем ниже её заголовка
  const SuccessHeading = HEADINGS[NESTED[headingLevel]];

  // после «Написать ещё один» фокус возвращается в первое поле:
  // иначе он остаётся на исчезнувшей кнопке и уезжает в начало страницы
  useEffect(() => {
    if (!restarted.current) return;
    restarted.current = false;
    formRef.current?.querySelector<HTMLInputElement>('[name="name"]')?.focus();
  }, [status]);

  function focusField(field: string): void {
    formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  }

  function changeValue(patch: Partial<ReviewFormValues>, field: keyof ReviewFormValues): void {
    setValues((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => {
      if (previous[field] === undefined) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function restart(): void {
    setValues(emptyReviewValues());
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

    const found = validateReviewValues(values);
    setFailure(undefined);

    if (found !== null) {
      setErrors(found);
      setStatus('idle');
      const first = REVIEW_FIELD_ORDER.find((field) => found[field] !== undefined);
      if (first !== undefined) focusField(first);
      return;
    }

    setErrors({});
    setStatus('sending');

    const result = await submit(buildReviewFormData(values, photo, honeypot));

    if (result.ok) {
      setGreeting(values.name.trim());
      setStatus('success');
      onSuccess?.(result.id);
      return;
    }

    setFailure(result.message);
    setStatus('error');

    const field = REVIEW_FIELD_ORDER.find((known) => known === result.field);
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
          ? `${failure}. ${texts.errorRetryLead}`
          : '';

  return (
    <Card
      variant="default"
      padding="lg"
      id={id}
      className={[styles.card, className].filter(Boolean).join(' ')}
    >
      <header className={styles.header}>
        <Heading className={styles.title} id={headingId}>
          {title}
        </Heading>
        <p className={styles.description}>{description}</p>
      </header>

      {/* Итог отправки объявляется отсюда: область живёт в разметке всегда,
          иначе часть скринридеров не заметит её появления */}
      <p className="srOnly" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {status === 'success' ? (
        <div className={styles.success}>
          <span className={styles.successIcon} aria-hidden="true">
            <Icon name="check" size={34} />
          </span>
          <SuccessHeading className={styles.successTitle}>{texts.successTitle}</SuccessHeading>
          <p className={styles.successText}>{texts.successThanks(greeting)}</p>
          <p className={styles.successText}>{texts.successModeration}</p>
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
          aria-labelledby={headingId}
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
          </div>

          {/* оценка — нативные радиокнопки внутри Rating: стрелки, Tab
              и группировка работают без единой строки своего JS */}
          <Rating
            mode="input"
            name="rating"
            size="lg"
            label={texts.ratingLabel}
            required
            value={values.rating}
            error={errors.rating}
            onChange={(rating) => changeValue({ rating }, 'rating')}
          />

          <Textarea
            name="text"
            label={texts.textLabel}
            placeholder={texts.textPlaceholder}
            hint={texts.textHint}
            rows={4}
            required
            value={values.text}
            error={errors.text}
            onChange={(event) => changeValue({ text: event.target.value }, 'text')}
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
                <Link href={policyHref} className={styles.policy}>
                  {texts.consentPolicy}
                </Link>
              </>
            }
          />

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
              <p className={styles.failureText}>{texts.errorRetryLead}</p>
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
