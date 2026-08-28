'use client';

import { useState, type FormEvent } from 'react';

import { Button, Checkbox, Input, Textarea, useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { EMPTY_SPEC_DICTIONARY, type SpecDictionary } from '@/entities/product/lib/groupSpecs';

import { ProductFormSection, type ProductSurface } from './ProductFormSurface';
import { SpecsEditor } from './SpecsEditor';
import { productFormContent as texts } from './content';
import type {
  ProductDelete,
  ProductFormStatus,
  ProductFormValues,
  ProductSave,
  SpecPair,
} from './model';
import styles from './ProductForm.module.css';

export interface ProductFormProps {
  readonly values: ProductFormValues;
  readonly save: ProductSave;
  /** Есть только у существующей модели: новую удалять нечего. */
  readonly remove?: ProductDelete | undefined;
  /** Куда уйти после создания или удаления. */
  readonly onDone?: ((id: string) => void) | undefined;
  /** Новая модель: подписи и кнопка называются иначе. */
  readonly isNew?: boolean | undefined;
  /** Подтверждение удаления. Подменяется в тестах — `confirm` в них недоступен. */
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
  /** Справочник характеристик: подсказки названий и типовые наборы (ADR-094). */
  readonly specDictionary?: SpecDictionary | undefined;
  /** Своя карточка у каждой секции или только поля: см. `ProductSurface`. */
  readonly surface?: ProductSurface | undefined;
}

/**
 * Форма модели каталога.
 *
 * Скидки здесь нет намеренно: её задаёт отдельная форма и отдельная ручка
 * (docs/API.md §3). Принимать конечную цену ещё и тут значило бы иметь два
 * места, где рождается перечёркнутая цена — ровно то, что запрещает
 * инвариант 14.
 *
 * Значения полей — строки. Числа приводит схема на сервере: приводить их и
 * здесь значит завести второе место, где рождается цена.
 */
export function ProductForm({
  values: initial,
  save,
  remove,
  onDone,
  isNew = false,
  confirmRemove,
  specDictionary = EMPTY_SPEC_DICTIONARY,
  surface = 'section',
}: ProductFormProps) {
  /* Подтверждение — общий диалог кита (ADR-113); проп остаётся швом
     для тестов, чтобы не открывать окно ради проверки удаления. */
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [values, setValues] = useState<ProductFormValues>(initial);
  const [status, setStatus] = useState<ProductFormStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const sending = status === 'sending';
  const busy = sending || removing;

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]): void => {
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
    if (result.field === undefined) {
      setMessage(result.message);
    } else {
      setFieldError({ field: result.field, message: result.message });
    }
  };

  const handleRemove = async (): Promise<void> => {
    if (remove === undefined || busy) return;
    if (!(await ask(texts.removeConfirm(values.name)))) return;

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
    <form
      className={surface === 'bare' ? `${styles.form} ${styles.bareForm}` : styles.form}
      onSubmit={submit}
      noValidate
    >
      <ProductFormSection surface={surface}>
        <h2 className={styles.title}>{texts.sectionMain}</h2>

        <div className={styles.fields}>
          <Input
            label={texts.name}
            required
            value={values.name}
            error={errorFor('name')}
            disabled={busy}
            wrapperClassName={styles.wide}
            onChange={(event) => set('name', event.target.value)}
          />
          <Input
            label={texts.badge}
            hint={texts.badgeHint}
            required
            value={values.badge}
            error={errorFor('badge')}
            disabled={busy}
            onChange={(event) => set('badge', event.target.value)}
          />
          <Input
            label={texts.areaMax}
            hint={texts.areaHint}
            type="number"
            required
            value={values.areaMax}
            error={errorFor('areaMax')}
            disabled={busy}
            onChange={(event) => set('areaMax', event.target.value)}
          />
          <Input
            label={texts.priceNum}
            hint={texts.priceHint}
            type="number"
            required
            value={values.priceNum}
            error={errorFor('priceNum')}
            disabled={busy}
            onChange={(event) => set('priceNum', event.target.value)}
          />
          <Input
            label={texts.tag}
            hint={texts.tagHint}
            value={values.tag}
            error={errorFor('tag')}
            disabled={busy}
            onChange={(event) => set('tag', event.target.value)}
          />

          {/* Два разных вопроса, поэтому два переключателя (ADR-109):
              «в продаже» — есть ли модель в каталоге, «на главной» — вынес ли
              её владелец в витрину лендинга. */}
          <Checkbox
            label={texts.visible}
            hint={texts.visibleHint}
            checked={values.visible}
            disabled={busy}
            onChange={(event) => set('visible', event.target.checked)}
          />

          <Checkbox
            label={texts.featured}
            hint={texts.featuredHint}
            checked={values.featured ?? false}
            disabled={busy}
            onChange={(event) => set('featured', event.target.checked)}
          />
        </div>
      </ProductFormSection>

      <ProductFormSection surface={surface}>
        <SpecsEditor
          specs={values.specs}
          disabled={busy}
          dictionary={specDictionary}
          onChange={(specs: readonly SpecPair[]) => set('specs', specs)}
        />
      </ProductFormSection>

      <ProductFormSection surface={surface}>
        <h2 className={styles.title}>{texts.sectionExtra}</h2>

        <div className={styles.fields}>
          <Input
            label={texts.brand}
            value={values.brand}
            disabled={busy}
            onChange={(event) => set('brand', event.target.value)}
          />
          <Input
            label={texts.sku}
            value={values.sku}
            disabled={busy}
            onChange={(event) => set('sku', event.target.value)}
          />
          <Input
            label={texts.sort}
            hint={texts.sortHint}
            type="number"
            value={values.sort}
            disabled={busy}
            onChange={(event) => set('sort', event.target.value)}
          />
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
            label={texts.link}
            value={values.link}
            disabled={busy}
            wrapperClassName={styles.wide}
            onChange={(event) => set('link', event.target.value)}
          />
        </div>
      </ProductFormSection>

      <ProductFormSection surface={surface}>
        <h2 className={styles.title}>{texts.sectionSeo}</h2>

        <div className={styles.fields}>
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
            wrapperClassName={styles.wide}
            onChange={(event) => set('seoDescription', event.target.value)}
          />
        </div>
      </ProductFormSection>

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

      {dialog}
    </form>
  );
}
