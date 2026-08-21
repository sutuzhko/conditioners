'use client';

import { useState, type FormEvent, type ReactNode } from 'react';

import { Button, Card, Checkbox, Input, Textarea } from '@/shared/ui';

import { articleFormContent as texts } from './content';
import type { ArticleDelete, ArticleFormStatus, ArticleFormValues, ArticleSave } from './model';
import styles from './ArticleForm.module.css';

export interface ArticleFormProps {
  readonly values: ArticleFormValues;
  readonly save: ArticleSave;
  readonly remove?: ArticleDelete | undefined;
  readonly onDone?: ((id: string) => void) | undefined;
  readonly isNew?: boolean | undefined;
  /**
   * Предпросмотр текста.
   *
   * Слотом, а не своим разбором: рисовать статью умеет виджет, а фича не
   * имеет права его импортировать. Зато так предпросмотр показывает ровно то
   * же, что и страница статьи, — второй разборщик разошёлся бы с первым.
   */
  readonly renderPreview?: ((body: string) => ReactNode) | undefined;
  readonly confirmRemove?: ((message: string) => boolean) | undefined;
}

/** Форма статьи базы знаний. */
export function ArticleForm({
  values: initial,
  save,
  remove,
  onDone,
  isNew = false,
  renderPreview,
  confirmRemove = (message) => window.confirm(message),
}: ArticleFormProps) {
  const [values, setValues] = useState<ArticleFormValues>(initial);
  const [status, setStatus] = useState<ArticleFormStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const sending = status === 'sending';
  const busy = sending || removing;

  const set = <K extends keyof ArticleFormValues>(key: K, value: ArticleFormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
    setFieldError((prev) => (prev?.field === key ? null : prev));
  };

  const errorFor = (field: string): string | undefined =>
    fieldError?.field === field ? fieldError.message : undefined;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;

    setStatus('sending');
    setMessage('');
    setFieldError(null);

    const result = await save(values);

    if (result.ok) {
      setStatus('success');
      onDone?.(result.id);
      return;
    }

    setStatus('error');
    if (result.field === undefined) setMessage(result.message);
    else setFieldError({ field: result.field, message: result.message });
  };

  const handleRemove = async (): Promise<void> => {
    if (remove === undefined || busy) return;
    if (!confirmRemove(texts.removeConfirm(values.title))) return;

    setRemoving(true);
    const result = await remove();

    if (result.ok) {
      onDone?.('');
      return;
    }

    setRemoving(false);
    setStatus('error');
    setMessage(result.message ?? texts.serverError);
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Card as="section">
        <h2 className={styles.title}>{texts.sectionMain}</h2>

        <div className={styles.fields}>
          <Input
            label={texts.title}
            required
            value={values.title}
            error={errorFor('title')}
            disabled={busy}
            wrapperClassName={styles.wide}
            onChange={(event) => set('title', event.target.value)}
          />
          <Input
            label={texts.category}
            hint={texts.categoryHint}
            required
            value={values.category}
            error={errorFor('category')}
            disabled={busy}
            onChange={(event) => set('category', event.target.value)}
          />
          <Input
            label={texts.date}
            type="date"
            required
            value={values.date}
            error={errorFor('date')}
            disabled={busy}
            onChange={(event) => set('date', event.target.value)}
          />
          <Input
            label={texts.minutes}
            type="number"
            required
            value={values.minutes}
            error={errorFor('minutes')}
            disabled={busy}
            onChange={(event) => set('minutes', event.target.value)}
          />
          <Textarea
            label={texts.excerpt}
            hint={texts.excerptHint}
            rows={3}
            required
            value={values.excerpt}
            error={errorFor('excerpt')}
            disabled={busy}
            className={styles.wide}
            onChange={(event) => set('excerpt', event.target.value)}
          />

          <Checkbox
            label={texts.published}
            hint={texts.publishedHint}
            checked={values.published}
            disabled={busy}
            onChange={(event) => set('published', event.target.checked)}
          />
        </div>
      </Card>

      <Card as="section">
        <h2 className={styles.title}>{texts.sectionBody}</h2>

        <div className={styles.editor}>
          <Textarea
            label={texts.body}
            hint={texts.bodyHint}
            rows={20}
            required
            value={values.body}
            error={errorFor('body')}
            disabled={busy}
            className={styles.body}
            onChange={(event) => set('body', event.target.value)}
          />

          {renderPreview === undefined ? null : (
            <section className={styles.preview} aria-label={texts.preview}>
              <h3 className={styles.previewTitle}>{texts.preview}</h3>
              <p className={styles.previewHint}>{texts.previewHint}</p>

              {values.body.trim() === '' ? (
                <p className={styles.previewEmpty}>{texts.previewEmpty}</p>
              ) : (
                renderPreview(values.body)
              )}
            </section>
          )}
        </div>
      </Card>

      <Card as="section">
        <h2 className={styles.title}>{texts.sectionSeo}</h2>

        <div className={styles.fields}>
          <Input
            label={texts.slug}
            hint={texts.slugHint}
            value={values.slug}
            error={errorFor('slug')}
            disabled={busy}
            wrapperClassName={styles.wide}
            onChange={(event) => set('slug', event.target.value)}
          />
          <Input
            label={texts.seoTitle}
            value={values.seoTitle}
            disabled={busy}
            wrapperClassName={styles.wide}
            onChange={(event) => set('seoTitle', event.target.value)}
          />
          <Textarea
            label={texts.seoDescription}
            rows={3}
            value={values.seoDescription}
            disabled={busy}
            className={styles.wide}
            onChange={(event) => set('seoDescription', event.target.value)}
          />
        </div>
      </Card>

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      <div className={styles.actions}>
        <Button type="submit" loading={sending} disabled={removing}>
          {sending ? texts.saving : isNew ? texts.create : texts.save}
        </Button>

        {status === 'success' && !isNew ? (
          <p className={styles.saved} role="status">
            {texts.saved}
          </p>
        ) : null}

        {remove === undefined ? null : (
          <Button
            type="button"
            variant="ghost"
            className={styles.remove}
            loading={removing}
            disabled={sending}
            onClick={handleRemove}
          >
            {removing ? texts.removing : texts.remove}
          </Button>
        )}
      </div>
    </form>
  );
}
