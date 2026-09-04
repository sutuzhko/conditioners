'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';

import { Badge, Button, FormSection, Input, Switch, Textarea, useConfirm } from '@/shared/ui';
import type { Confirm, FormSectionLevel, FormSurface } from '@/shared/ui';

import { articleFormContent as texts } from './content';
import { applyMarkup, type MarkupKind } from './markup';
import {
  SEO_DESCRIPTION_LIMIT,
  SEO_TITLE_LIMIT,
  type ArticleDelete,
  type ArticleFormStatus,
  type ArticleFormValues,
  type ArticleSave,
  type ArticleTab,
} from './model';
import { buildSerpSnippet } from './serp';
import { SerpPreview } from './SerpPreview';
import styles from './ArticleForm.module.css';

export interface ArticleFormProps {
  readonly values: ArticleFormValues;
  readonly save: ArticleSave;
  readonly remove?: ArticleDelete | undefined;
  readonly onDone?: ((id: string) => void) | undefined;
  readonly isNew?: boolean | undefined;
  /**
   * Открытая вкладка. Не задана — форма показывает всё сразу: у новой статьи
   * вкладок нет, делить нечего (issue #355).
   */
  readonly tab?: ArticleTab | undefined;
  /** Адрес сайта с сервера: в коде его нет (инвариант 8). */
  readonly siteUrl?: string | undefined;
  /** Приписка к заголовкам из настроек компании. */
  readonly titleSuffix?: string | undefined;
  /** Когда статью сохраняли в последний раз, ISO. */
  readonly updatedAt?: string | undefined;
  /**
   * Обложка — слотом: файл грузится своей ручкой, и форма о ней не знает.
   * На широком экране слот стоит в боковой колонке вкладки «Текст», ниже
   * 1200px — на вкладке «Публикация» (issue #355).
   */
  readonly cover?: ReactNode | undefined;
  /**
   * Предпросмотр текста.
   *
   * Слотом, а не своим разбором: рисовать статью умеет виджет, а фича не
   * имеет права его импортировать. Зато так предпросмотр показывает ровно то
   * же, что и страница статьи, — второй разборщик разошёлся бы с первым.
   */
  readonly renderPreview?: ((body: string) => ReactNode) | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
  /** Свои карточки с заголовками или только поля: см. `FormSurface`. */
  readonly surface?: FormSurface | undefined;
  /** Уровень заголовков разделов: на странице 2, внутри окна 3. */
  readonly headingLevel?: FormSectionLevel | undefined;
}

/**
 * Форма статьи базы знаний.
 *
 * 🔴 Три вкладки — три части работы: набор текста, выдача и публикация
 * (issue #355). Состояние формы одно на все три: вкладка меняет адрес, а не
 * компонент, и начатый черновик переживает переход.
 */
export function ArticleForm({
  values: initial,
  save,
  remove,
  onDone,
  isNew = false,
  tab,
  siteUrl = '',
  titleSuffix = '',
  updatedAt,
  cover,
  renderPreview,
  confirmRemove,
  surface = 'card',
  headingLevel = 2,
}: ArticleFormProps) {
  /* Подтверждение — общий диалог кита (ADR-113); проп остаётся швом
     для тестов, чтобы не открывать окно ради проверки удаления. */
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  /* 🔴 Поле текста находится по своему идентификатору, а не по ссылке:
     `Textarea` — компонент кита, кит закрыт, и проталкивать сквозь него `ref`
     ради панели инструментов значит править общий компонент ради одного
     экрана. Идентификатор он принимает и так. */
  const bodyId = useId();

  const [values, setValues] = useState<ArticleFormValues>(initial);
  const [status, setStatus] = useState<ArticleFormStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | undefined>(updatedAt);

  const sending = status === 'sending';
  const busy = sending || removing;

  /* Вкладка не задана — показываем всё: так открывается создание статьи. */
  const shows = (name: ArticleTab): boolean => tab === undefined || tab === name;

  const set = <K extends keyof ArticleFormValues>(key: K, value: ArticleFormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
    setFieldError((prev) => (prev?.field === key ? null : prev));
  };

  const errorFor = (field: string): string | undefined =>
    fieldError?.field === field ? fieldError.message : undefined;

  /**
   * Разметка ставится в текст и возвращает выделение на место: без этого
   * курсор прыгает в конец, и следующая кнопка размечает не ту строку.
   */
  const insert = (kind: MarkupKind): void => {
    const field = document.getElementById(bodyId);
    if (!(field instanceof HTMLTextAreaElement)) return;

    const next = applyMarkup(values.body, field.selectionStart, field.selectionEnd, kind);
    set('body', next.body);

    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;

    setStatus('sending');
    setMessage('');
    setFieldError(null);

    const result = await save(values);

    if (result.ok) {
      setStatus('success');
      setSavedAt(new Date().toISOString());
      onDone?.(result.id);
      return;
    }

    setStatus('error');
    if (result.field === undefined) setMessage(result.message);
    else setFieldError({ field: result.field, message: result.message });
  };

  const handleRemove = async (): Promise<void> => {
    if (remove === undefined || busy) return;
    if (!(await ask(texts.removeConfirm(values.title)))) return;

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

  const snippet = buildSerpSnippet({
    title: values.title,
    seoTitle: values.seoTitle,
    excerpt: values.excerpt,
    seoDescription: values.seoDescription,
    slug: values.slug,
    siteUrl,
    titleSuffix,
  });

  const statusBadge = (
    <Badge variant={values.published ? 'success' : 'warning'} size="sm">
      {values.published ? texts.statusPublished : texts.statusDraft}
    </Badge>
  );

  return (
    <form
      className={[styles.form, surface === 'bare' ? styles.inWindow : null]
        .filter(Boolean)
        .join(' ')}
      onSubmit={submit}
      noValidate
    >
      {shows('text') ? (
        <div className={styles.editor}>
          <FormSection
            surface={surface}
            headingLevel={headingLevel}
            title={texts.sectionBody}
            /* До 1200px боковой колонки нет — состояние переезжает в шапку
               раздела, к панели инструментов (issue #355). */
            titleAside={<span className={styles.narrowOnly}>{statusBadge}</span>}
            className={styles.editorSection}
          >
            {/* 🔴 Панель прокручивается вбок на телефоне, а не переносится:
                перенос делает её двухэтажной и съедает экран набора. */}
            <div className={styles.toolbar} role="group" aria-label={texts.toolbarLabel}>
              <MarkupButton
                title={texts.markupH2Title}
                disabled={busy}
                onClick={() => insert('h2')}
              >
                {texts.markupH2}
              </MarkupButton>
              <MarkupButton
                title={texts.markupH3Title}
                disabled={busy}
                onClick={() => insert('h3')}
              >
                {texts.markupH3}
              </MarkupButton>
              <MarkupButton
                title={texts.markupBoldTitle}
                disabled={busy}
                className={styles.bold}
                onClick={() => insert('bold')}
              >
                {texts.markupBold}
              </MarkupButton>
              <MarkupButton
                title={texts.markupListTitle}
                disabled={busy}
                onClick={() => insert('list')}
              >
                {texts.markupList}
              </MarkupButton>
              <MarkupButton
                title={texts.markupCalloutTitle}
                disabled={busy}
                onClick={() => insert('callout')}
              >
                {texts.markupCallout}
              </MarkupButton>
            </div>

            <Input
              label={texts.title}
              required
              value={values.title}
              error={errorFor('title')}
              disabled={busy}
              wrapperClassName={styles.column}
              onChange={(event) => set('title', event.target.value)}
            />

            {/* 🔴 Колонка набора шириной 68ch: статью читают на сайте, а не
                здесь, и строка в полтора экрана сбивает ритм текста. */}
            <Textarea
              id={bodyId}
              label={texts.body}
              hint={texts.bodyHint}
              rows={18}
              required
              value={values.body}
              error={errorFor('body')}
              disabled={busy}
              wrapperClassName={styles.column}
              className={styles.body}
              onChange={(event) => set('body', event.target.value)}
            />

            <p className={styles.missing}>{texts.markupMissing}</p>

            {renderPreview === undefined ? null : (
              <section className={styles.preview} aria-label={texts.preview}>
                <p className={styles.previewHint}>{texts.previewHint}</p>

                {values.body.trim() === '' ? (
                  <p className={styles.previewEmpty}>{texts.previewEmpty}</p>
                ) : (
                  renderPreview(values.body)
                )}
              </section>
            )}
          </FormSection>

          {/* Боковая колонка: состояние и обложка. До 1200px её нет — статус
              уезжает в шапку раздела, обложка на вкладку «Публикация». */}
          <div className={`${styles.side} ${styles.wideOnly}`}>
            <FormSection
              surface={surface}
              headingLevel={headingLevel}
              title={texts.stateTitle}
              gap="sm"
            >
              <dl className={styles.state}>
                <div className={styles.stateRow}>
                  <dt className={styles.stateName}>{texts.stateStatus}</dt>
                  <dd className={styles.stateValue}>{statusBadge}</dd>
                </div>
                <div className={styles.stateRow}>
                  <dt className={styles.stateName}>{texts.stateCharacters}</dt>
                  <dd className={`${styles.stateValue} ${styles.number}`}>
                    {texts.characters(values.body.length)}
                  </dd>
                </div>
                <div className={styles.stateRow}>
                  <dt className={styles.stateName}>{texts.stateSaved}</dt>
                  <dd className={`${styles.stateValue} ${styles.number}`}>
                    {savedAt === undefined ? texts.stateNotSaved : texts.savedAt(savedAt)}
                  </dd>
                </div>
              </dl>
            </FormSection>

            {cover}
          </div>
        </div>
      ) : null}

      {shows('seo') ? (
        <div className={styles.seo}>
          {/* 🔴 В разметке превью стоит перед полями: до 1200px его читают
              сверху вниз — title правят, глядя на него, а не наоборот
              (issue #355). На широком экране колонки меняет сетка, и обход
              табом совпадает с экраном на обеих раскладках. */}
          <FormSection
            surface={surface}
            headingLevel={headingLevel}
            title={texts.seoPreviewTitle}
            gap="sm"
            className={styles.previewCard}
          >
            <SerpPreview snippet={snippet} />
          </FormSection>

          <FormSection
            surface={surface}
            headingLevel={headingLevel}
            title={texts.seoFieldsTitle}
            className={styles.seoCard}
          >
            <div className={styles.field}>
              <Input
                label={texts.seoTitle}
                value={values.seoTitle}
                disabled={busy}
                onChange={(event) => set('seoTitle', event.target.value)}
              />
              <Counter length={values.seoTitle.length} limit={SEO_TITLE_LIMIT} />
            </div>

            <div className={styles.field}>
              <Textarea
                label={texts.seoDescription}
                rows={3}
                value={values.seoDescription}
                disabled={busy}
                onChange={(event) => set('seoDescription', event.target.value)}
              />
              <Counter length={values.seoDescription.length} limit={SEO_DESCRIPTION_LIMIT} />
            </div>

            {/* 🔴 Слаг обязателен: из него собирается каноникал, и без него у
                страницы нет собственного адреса (ADR-281). */}
            <Input
              label={texts.slug}
              hint={isNew ? texts.slugHint : texts.slugHintSaved}
              required={!isNew}
              value={values.slug}
              error={errorFor('slug') ?? (isNew ? undefined : slugError(values.slug))}
              disabled={busy}
              onChange={(event) => set('slug', event.target.value)}
            />

            {/* 🔴 Каноникал показан вычисленным и не правится (ADR-281):
                введённый руками и разошедшийся с собственным адресом, он
                уводит статью из индекса одной опечаткой. */}
            <div className={styles.canonical}>
              <span className={styles.canonicalLabel}>{texts.canonical}</span>
              <output className={styles.canonicalValue}>
                {values.slug.trim() === '' ? texts.canonicalEmpty : snippet.canonical}
              </output>
              <span className={styles.canonicalHint}>{texts.canonicalHint}</span>
            </div>
          </FormSection>
        </div>
      ) : null}

      {shows('publish') ? (
        <div className={styles.publish}>
          <FormSection
            surface={surface}
            headingLevel={headingLevel}
            title={texts.publishTitle}
            className={styles.publishCard}
          >
            <div className={styles.publishFields}>
              <Switch
                label={texts.publishSwitch}
                hint={texts.publishSwitchHint}
                checked={values.published}
                disabled={busy}
                labelFirst
                wrapperClassName={styles.wide}
                onChange={(event) => set('published', event.target.checked)}
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
              <Input
                label={texts.category}
                hint={texts.categoryHint}
                required
                value={values.category}
                error={errorFor('category')}
                disabled={busy}
                wrapperClassName={styles.wide}
                onChange={(event) => set('category', event.target.value)}
              />
              <Textarea
                label={texts.excerpt}
                hint={texts.excerptHint}
                rows={3}
                required
                value={values.excerpt}
                error={errorFor('excerpt')}
                disabled={busy}
                wrapperClassName={styles.wide}
                onChange={(event) => set('excerpt', event.target.value)}
              />
            </div>
          </FormSection>

          {/* Обложка приезжает сюда с боковой колонки, когда та закрыта. */}
          <div className={styles.narrowOnly}>{cover}</div>
        </div>
      ) : null}

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      <div className={styles.actions} data-sticky="bottom">
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
            variant="light"
            className={styles.remove}
            loading={removing}
            disabled={sending}
            onClick={handleRemove}
          >
            {removing ? texts.removing : texts.remove}
          </Button>
        )}
      </div>

      {dialog}
    </form>
  );
}

/** Пустой адрес у сохранённой статьи — это отсутствующий каноникал (ADR-281). */
function slugError(slug: string): string | undefined {
  return slug.trim() === '' ? texts.slugRequired : undefined;
}

function MarkupButton({
  children,
  title,
  disabled,
  className,
  onClick,
}: {
  readonly children: ReactNode;
  readonly title: string;
  readonly disabled: boolean;
  readonly className?: string | undefined;
  readonly onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="light"
      size="sm"
      title={title}
      aria-label={title}
      disabled={disabled}
      className={[styles.tool, className].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/**
 * Счётчик длины.
 *
 * 🔴 Длину меряет счётчик, а не глазомер: обрезанный в поиске заголовок стоит
 * кликов (issue #355). Превышение красится, но ввод не запрещает — это
 * предупреждение, а не ошибка ввода.
 */
function Counter({ length, limit }: { readonly length: number; readonly limit: number }) {
  const over = length > limit;

  return (
    <p className={[styles.counter, over ? styles.counterOver : null].filter(Boolean).join(' ')}>
      <span className="srOnly">{texts.counterLabel(length, limit)}</span>
      <span aria-hidden="true">{texts.counter(length, limit)}</span>
      {over ? <span className={styles.counterNote}>{texts.tooLong}</span> : null}
    </p>
  );
}
