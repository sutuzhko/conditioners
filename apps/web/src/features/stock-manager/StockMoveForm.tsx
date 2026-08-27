'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button, Card, Input, Select, Textarea } from '@/shared/ui';

import { STOCK_MOVE_TITLES, STOCK_UNIT_TITLES, stockManagerContent as texts } from './content';
import { StockFormSurface, type StockSurface } from './StockFormSurface';
import { stockApi } from './lib';
import {
  STOCK_SECTION_MOVES,
  checkMove,
  emptyMoveDraft,
  isStockMoveKind,
  type FieldIssue,
  type StockApi,
  type StockItemRef,
  type StockMoveDraft,
  type StockMoveKind,
  type StockStatus,
  type StockZoneCard,
} from './model';
import styles from './StockMoveForm.module.css';

export interface StockMoveFormProps {
  /** Позиции, между которыми можно выбирать. Одна — форма её и проводит. */
  readonly items: readonly StockItemRef[];
  /** Зоны хранения. Архивные в выбор не попадают: движений в них уже не будет. */
  readonly zones: readonly StockZoneCard[];
  readonly api?: StockApi | undefined;
  readonly onSaved?: (() => void) | undefined;
  /**
   * Что уже подставлено адресом окна: позиция и зоны при перетаскивании
   * известны, вводят только количество (ADR-137).
   */
  readonly initial?: StockMoveDraft | undefined;
  /** Ставить курсор в количество: всё остальное пришло из адреса. */
  readonly autoFocusQty?: boolean | undefined;
  /** Своя карточка с заголовком или только поля: см. `StockSurface`. */
  readonly surface?: StockSurface | undefined;
}

/**
 * Приход, перемещение между зонами и инвентаризация.
 *
 * 🔴 Списания в наряд и возврата здесь нет: они делаются из карточки наряда,
 * где известно, на какую работу ушёл материал (docs/API.md §14).
 *
 * 🔴 Остаток не правится напрямую ни одним полем. Правка руками существует, но
 * как инвентаризация с обязательным основанием — иначе вопрос «куда делись
 * тридцать метров трассы» остаётся без ответа (ADR-134).
 */
export function StockMoveForm({
  items,
  zones,
  api = stockApi,
  onSaved,
  initial,
  autoFocusQty = false,
  surface = 'section',
}: StockMoveFormProps) {
  const router = useRouter();
  const open = zones.filter((zone) => !zone.archived);
  const single = items.length === 1 ? items[0] : undefined;

  const qtyRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<StockMoveDraft>(
    () => initial ?? emptyMoveDraft(single?.id ?? ''),
  );
  const [status, setStatus] = useState<StockStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState<FieldIssue | null>(null);

  const sending = status === 'sending';
  const selected = items.find((item) => item.id === draft.itemId);
  const transfer = draft.kind === 'transfer';
  const count = draft.kind === 'count';
  /* Перемещение требует двух зон: с одной оно бессмысленно, и сервер его
     отвергнет — сказать об этом до отправки честнее. */
  const blocked = transfer && open.length < 2;

  const set = <K extends keyof StockMoveDraft>(key: K, value: StockMoveDraft[K]): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
    setFieldError((prev) => (prev?.field === key ? null : prev));
  };

  const setKind = (kind: StockMoveKind): void => {
    /* Поля чужого вида не переезжают: «приход, у которого зачем-то есть
       зона-источник» сервер не должен даже разбирать. */
    setDraft((prev) => ({ ...prev, kind, fromZoneId: '', serials: '' }));
    setStatus('idle');
    setFieldError(null);
  };

  const errorFor = (field: keyof StockMoveDraft): string | undefined =>
    fieldError?.field === field ? fieldError.message : undefined;

  /* Окно уводит фокус на «Закрыть» своим эффектом, а эффекты идут снизу вверх —
     поэтому курсор в количество ставится кадром позже. Перемещение открывают
     ради одного числа: всё остальное подставил адрес. */
  useEffect(() => {
    if (!autoFocusQty) return;

    const frame = requestAnimationFrame(() => qtyRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocusQty]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    /* Мгновенная подсказка той же схемой, что проверяет сервер: «Инвентаризация
       без основания не проводится» человек должен прочитать до отправки. */
    const issue = checkMove(draft);
    if (issue !== null) {
      setStatus('error');
      setFieldError(issue);
      setMessage('');
      return;
    }

    setStatus('sending');
    setMessage('');
    setFieldError(null);

    const result = await api.move(draft);

    if (result.ok) {
      /* Вид и позиция остаются: приход заводят подряд по накладной. */
      setDraft((prev) => ({ ...emptyMoveDraft(prev.itemId), kind: prev.kind }));
      qtyRef.current?.focus();
      setStatus('success');
      onSaved?.();
      router.refresh();
      return;
    }

    setStatus('error');
    if (result.field === undefined) setMessage(result.message);
    else setFieldError({ field: result.field, message: result.message });
  };

  if (open.length === 0) return <Note text={texts.moveNoZones} />;
  if (items.length === 0) return <Note text={texts.moveNoItems} />;

  const zoneOptions = open.map((zone) => ({ value: zone.id, label: zone.name }));
  const unitSuffix = selected === undefined ? '' : `, ${STOCK_UNIT_TITLES[selected.unit]}`;

  return (
    <StockFormSurface surface={surface}>
      <form className={styles.form} onSubmit={submit} noValidate>
        {surface === 'section' ? (
          <>
            <h2 className={styles.title}>{texts.moveTitle}</h2>
            <p className={styles.hint}>{texts.moveHint}</p>
          </>
        ) : null}

        <div className={styles.grid}>
          <Select
            label={texts.moveKind}
            value={draft.kind}
            disabled={sending}
            options={STOCK_SECTION_MOVES.map((kind) => ({
              value: kind,
              label: STOCK_MOVE_TITLES[kind],
            }))}
            onChange={(event) => {
              const value = event.target.value;
              if (isStockMoveKind(value)) setKind(value);
            }}
          />

          {single === undefined ? (
            <Select
              label={texts.moveItem}
              placeholder={texts.moveItemPlaceholder}
              value={draft.itemId}
              disabled={sending}
              error={errorFor('itemId')}
              options={items.map((item) => ({ value: item.id, label: item.name }))}
              onChange={(event) => set('itemId', event.target.value)}
            />
          ) : (
            <p className={styles.fixed}>
              <span className={styles.fixedLabel}>{texts.moveItemFixed}</span>
              <span className={styles.fixedValue}>{single.name}</span>
            </p>
          )}

          <Input
            ref={qtyRef}
            label={(count ? texts.moveDelta : texts.moveQty) + unitSuffix}
            hint={count ? texts.moveDeltaHint : texts.moveQtyHint}
            value={draft.qty}
            disabled={sending}
            error={errorFor('qty')}
            inputMode="decimal"
            autoComplete="off"
            onChange={(event) => set('qty', event.target.value)}
          />

          {transfer ? (
            <Select
              label={texts.moveFrom}
              placeholder={texts.moveZonePlaceholder}
              value={draft.fromZoneId}
              disabled={sending}
              error={errorFor('fromZoneId')}
              options={zoneOptions}
              onChange={(event) => set('fromZoneId', event.target.value)}
            />
          ) : null}

          <Select
            label={count ? texts.moveZone : texts.moveTo}
            placeholder={texts.moveZonePlaceholder}
            value={draft.toZoneId}
            disabled={sending}
            error={errorFor('toZoneId')}
            options={zoneOptions}
            onChange={(event) => set('toZoneId', event.target.value)}
          />

          {draft.kind === 'income' ? (
            <Input
              label={texts.moveSerials}
              hint={texts.moveSerialsHint}
              value={draft.serials}
              disabled={sending}
              error={errorFor('serials')}
              autoComplete="off"
              wrapperClassName={styles.wide}
              onChange={(event) => set('serials', event.target.value)}
            />
          ) : null}

          <Textarea
            label={count ? texts.moveReasonRequired : texts.moveReason}
            hint={count ? texts.moveReasonRequiredHint : texts.moveReasonHint}
            rows={2}
            value={draft.reason}
            disabled={sending}
            error={errorFor('reason')}
            required={count}
            wrapperClassName={styles.wide}
            onChange={(event) => set('reason', event.target.value)}
          />
        </div>

        <div className={styles.actions}>
          {/* Подпись меняется на «Проводим…», а не подменяется индикатором:
              видимый текст объясняет состояние точнее крутящегося колечка. */}
          <Button type="submit" disabled={sending || blocked}>
            {sending ? texts.moveSending : texts.moveSubmit}
          </Button>

          {status === 'success' ? (
            <span className={styles.ok} role="status">
              {texts.moveDone}
            </span>
          ) : null}
        </div>

        {blocked ? <p className={styles.warning}>{texts.moveNoSecondZone}</p> : null}

        {status === 'error' && message !== '' ? (
          <p className={styles.error} role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </StockFormSurface>
  );
}

/** Проводить движение не из чего: раздел объясняет, чего не хватает. */
function Note({ text }: { readonly text: string }) {
  return (
    <Card as="section">
      <h2 className={styles.title}>{texts.moveTitle}</h2>
      <p className={styles.empty}>{text}</p>
    </Card>
  );
}
