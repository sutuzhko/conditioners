'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Badge, Button, Input, Select, Textarea, useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { STOCK_UNIT_FULL, stockManagerContent as texts } from './content';
import { StockFormSurface, type StockSurface } from './StockFormSurface';
import { stockApi } from './lib';
import {
  STOCK_UNITS,
  checkItem,
  emptyItemDraft,
  isStockUnit,
  type FieldIssue,
  type StockApi,
  type StockItemDraft,
  type StockItemProduct,
  type StockStatus,
} from './model';
import styles from './StockItemForm.module.css';

export interface StockItemFormProps {
  /** Действия раздела. Подменяются в историях и тестах, чтобы не поднимать сеть. */
  readonly api?: StockApi | undefined;
  /** Идентификатор существующей позиции; без него форма заводит новую. */
  readonly itemId?: string | undefined;
  readonly initial?: StockItemDraft | undefined;
  /** Модели каталога: техника на них ссылается, расходники — нет. */
  readonly products?: readonly StockItemProduct[] | undefined;
  readonly title?: string | undefined;
  readonly hint?: string | undefined;
  readonly onSaved?: (() => void) | undefined;
  /** Показывать ли сдачу в архив. Только у заведённой позиции. */
  readonly archivable?: boolean | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmArchive?: Confirm | undefined;
  /** Своя карточка с заголовком или только поля: см. `StockSurface`. */
  readonly surface?: StockSurface | undefined;
}

/**
 * Позиция справочника — одна форма и на заведение, и на правку.
 *
 * 🔴 Остатка здесь нет ни одним полем: он сумма движений, а не число, которое
 * правят по памяти (ADR-134). Меняются название, группа, единица, порог заказа
 * и ссылка на модель каталога — всё, что не считается по журналу.
 */
export function StockItemForm({
  api = stockApi,
  itemId,
  initial = emptyItemDraft,
  products = [],
  title = texts.itemAddTitle,
  hint = texts.itemAddHint,
  onSaved,
  archivable = false,
  confirmArchive,
  surface = 'section',
}: StockItemFormProps) {
  const { confirm, dialog } = useConfirm();
  const ask = confirmArchive ?? confirm;

  const router = useRouter();
  const [draft, setDraft] = useState<StockItemDraft>(initial);
  const [status, setStatus] = useState<StockStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState<FieldIssue | null>(null);
  const [archiving, setArchiving] = useState(false);

  const sending = status === 'sending';
  const busy = sending || archiving;
  const editing = itemId !== undefined;

  const set = <K extends keyof StockItemDraft>(key: K, value: StockItemDraft[K]): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
    setFieldError((prev) => (prev?.field === key ? null : prev));
  };

  const errorFor = (field: keyof StockItemDraft): string | undefined =>
    fieldError?.field === field ? fieldError.message : undefined;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;

    /* Мгновенная подсказка той же схемой, что проверяет сервер: круг через
       сеть ради «укажите название» человеку ничего не объясняет. */
    const issue = checkItem(draft, editing);
    if (issue !== null) {
      setStatus('error');
      setFieldError(issue);
      setMessage('');
      return;
    }

    setStatus('sending');
    setMessage('');
    setFieldError(null);

    const result = editing ? await api.updateItem(itemId, draft) : await api.createItem(draft);

    if (result.ok) {
      /* Заведение очищает форму, правка — оставляет: карточку продолжают
         смотреть, а следующую позицию вводят сразу. */
      if (!editing) setDraft(emptyItemDraft);
      setStatus('success');
      onSaved?.();
      return;
    }

    setStatus('error');
    if (result.field === undefined) setMessage(result.message);
    else setFieldError({ field: result.field, message: result.message });
  };

  /** Архив вместо удаления: удаление унесло бы журнал движений (ADR-134). */
  const archive = async (id: string): Promise<void> => {
    if (busy) return;
    if (!(await ask(texts.itemArchiveConfirm(draft.name)))) return;

    setArchiving(true);
    setMessage('');

    const result = await api.archiveItem(id);
    setArchiving(false);

    if (result.ok) {
      setDraft((prev) => ({ ...prev, archived: true }));
      setStatus('success');
      onSaved?.();
      router.refresh();
      return;
    }

    setStatus('error');
    setMessage(result.message);
  };

  /** Возврат из архива — обычная правка: тот же PATCH, только флагом. */
  const restore = async (id: string): Promise<void> => {
    if (busy) return;

    const restored: StockItemDraft = { ...draft, archived: false };
    setArchiving(true);
    setMessage('');

    const result = await api.updateItem(id, restored);
    setArchiving(false);

    if (result.ok) {
      setDraft(restored);
      setStatus('success');
      onSaved?.();
      router.refresh();
      return;
    }

    setStatus('error');
    setMessage(result.message);
  };

  return (
    <StockFormSurface surface={surface}>
      <form className={styles.form} onSubmit={submit} noValidate>
        {surface === 'section' ? (
          <>
            <div className={styles.head}>
              <h2 className={styles.title}>{title}</h2>
              {editing && draft.archived ? (
                <Badge variant="neutral" size="sm">
                  {texts.itemArchived}
                </Badge>
              ) : null}
            </div>
            <p className={styles.hint}>{hint}</p>
          </>
        ) : null}

        <div className={styles.grid}>
          <Input
            label={texts.itemName}
            hint={texts.itemNameHint}
            value={draft.name}
            disabled={busy}
            error={errorFor('name')}
            autoComplete="off"
            onChange={(event) => set('name', event.target.value)}
          />
          <Input
            label={texts.itemGroup}
            hint={texts.itemGroupHint}
            value={draft.group}
            disabled={busy}
            error={errorFor('group')}
            autoComplete="off"
            onChange={(event) => set('group', event.target.value)}
          />
          <Select
            label={texts.itemUnit}
            hint={texts.itemUnitHint}
            value={draft.unit}
            disabled={busy}
            error={errorFor('unit')}
            options={STOCK_UNITS.map((unit) => ({ value: unit, label: STOCK_UNIT_FULL[unit] }))}
            onChange={(event) => {
              /* Значение `select` — строка: принять её за единицу без проверки
                 нельзя, для того в контракте и есть страж. */
              const value = event.target.value;
              if (isStockUnit(value)) set('unit', value);
            }}
          />
          <Input
            label={texts.itemMinQty}
            hint={texts.itemMinQtyHint}
            value={draft.minQty}
            disabled={busy}
            error={errorFor('minQty')}
            inputMode="decimal"
            autoComplete="off"
            onChange={(event) => set('minQty', event.target.value)}
          />
          <Select
            label={texts.itemProduct}
            hint={texts.itemProductHint}
            value={draft.productId}
            disabled={busy}
            error={errorFor('productId')}
            wrapperClassName={styles.wide}
            options={[
              { value: '', label: texts.itemProductNone },
              ...products.map((product) => ({ value: product.id, label: product.name })),
            ]}
            onChange={(event) => set('productId', event.target.value)}
          />
          <Textarea
            label={texts.itemNote}
            hint={texts.itemNoteHint}
            rows={2}
            value={draft.note}
            disabled={busy}
            error={errorFor('note')}
            wrapperClassName={styles.wide}
            onChange={(event) => set('note', event.target.value)}
          />
        </div>

        <div className={styles.actions}>
          {/* Подпись меняется на «Сохраняем…», а не подменяется индикатором:
              видимый текст объясняет состояние точнее крутящегося колечка. */}
          <Button type="submit" disabled={busy}>
            {sending ? sendingLabel(editing) : idleLabel(editing)}
          </Button>

          {status === 'success' ? (
            <span className={styles.ok} role="status">
              {editing ? texts.itemSaved : texts.itemAdded}
            </span>
          ) : null}

          {archivable && editing ? (
            draft.archived ? (
              <Button
                type="button"
                variant="secondary"
                loading={archiving}
                disabled={sending}
                onClick={() => void restore(itemId)}
              >
                {texts.itemRestore}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className={styles.archive}
                loading={archiving}
                disabled={sending}
                onClick={() => void archive(itemId)}
              >
                {archiving ? texts.itemArchiving : texts.itemArchive}
              </Button>
            )
          ) : null}
        </div>

        {archivable && editing ? (
          <p className={styles.archiveHint}>
            {draft.archived ? texts.itemArchivedNote : texts.itemArchiveHint}
          </p>
        ) : null}

        {status === 'error' && message !== '' ? (
          <p className={styles.error} role="alert">
            {message}
          </p>
        ) : null}
      </form>

      {dialog}
    </StockFormSurface>
  );
}

function idleLabel(editing: boolean): string {
  return editing ? texts.itemSave : texts.itemAdd;
}

function sendingLabel(editing: boolean): string {
  return editing ? texts.itemSaving : texts.itemAdding;
}
