'use client';

import { useState, type FormEvent } from 'react';

import { Button, Card, Input, Select } from '@/shared/ui';

import { STOCK_ZONE_KIND_TITLES, stockManagerContent as texts } from './content';
import { stockApi } from './lib';
import {
  STOCK_ZONE_KINDS,
  checkZone,
  emptyZoneDraft,
  type FieldIssue,
  type StockApi,
  type StockStatus,
  type StockZoneDraft,
  type StockZoneKind,
  type StockZonePerson,
} from './model';
import styles from './StockZoneForm.module.css';

function isZoneKind(value: string): value is StockZoneKind {
  return STOCK_ZONE_KINDS.some((kind) => kind === value);
}

export interface StockZoneFormProps {
  /** Действия раздела. Подменяются в историях и тестах, чтобы не поднимать сеть. */
  readonly api?: StockApi | undefined;
  /** Идентификатор существующей зоны; без него форма заводит новую. */
  readonly zoneId?: string | undefined;
  readonly initial?: StockZoneDraft | undefined;
  /** За кем можно закрепить машину. */
  readonly people?: readonly StockZonePerson[] | undefined;
  readonly onSaved?: (() => void) | undefined;
  readonly onCancel?: (() => void) | undefined;
}

/**
 * Зона хранения: гараж или машина монтажника.
 *
 * 🔴 У машины обязателен хозяин, у склада хозяина быть не может — правило
 * живёт в схеме контракта, а форма обязана не давать ввести неверное: поле
 * «чья машина» появляется только у машины и очищается при переключении на
 * склад. Монтажник видит свою зону по этой связи, а не по названию.
 */
export function StockZoneForm({
  api = stockApi,
  zoneId,
  initial = emptyZoneDraft,
  people = [],
  onSaved,
  onCancel,
}: StockZoneFormProps) {
  const [draft, setDraft] = useState<StockZoneDraft>(initial);
  const [status, setStatus] = useState<StockStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState<FieldIssue | null>(null);

  const sending = status === 'sending';
  const editing = zoneId !== undefined;
  const van = draft.kind === 'van';

  const set = <K extends keyof StockZoneDraft>(key: K, value: StockZoneDraft[K]): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
    setFieldError((prev) => (prev?.field === key ? null : prev));
  };

  /* Смена вида уносит хозяина: склад с хозяином сервер не примет, и держать
     невидимое значение в состоянии значит отправить его при следующем «Сохранить». */
  const setKind = (kind: StockZoneKind): void => {
    setDraft((prev) => ({ ...prev, kind, userId: kind === 'van' ? prev.userId : '' }));
    setStatus('idle');
    setFieldError(null);
  };

  const errorFor = (field: keyof StockZoneDraft): string | undefined =>
    fieldError?.field === field ? fieldError.message : undefined;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    const issue = checkZone(draft, editing);
    if (issue !== null) {
      setStatus('error');
      setFieldError(issue);
      setMessage('');
      return;
    }

    setStatus('sending');
    setMessage('');
    setFieldError(null);

    const result = editing ? await api.updateZone(zoneId, draft) : await api.createZone(draft);

    if (result.ok) {
      if (!editing) setDraft(emptyZoneDraft);
      setStatus('success');
      onSaved?.();
      return;
    }

    setStatus('error');
    if (result.field === undefined) setMessage(result.message);
    else setFieldError({ field: result.field, message: result.message });
  };

  return (
    <Card as="section" variant="soft">
      <form className={styles.form} onSubmit={submit} noValidate>
        <h3 className={styles.title}>{editing ? texts.zoneEditTitle : texts.zoneAddTitle}</h3>
        {editing ? null : <p className={styles.hint}>{texts.zoneAddHint}</p>}

        <div className={styles.grid}>
          <Select
            label={texts.zoneKind}
            value={draft.kind}
            disabled={sending}
            error={errorFor('kind')}
            options={STOCK_ZONE_KINDS.map((kind) => ({
              value: kind,
              label: STOCK_ZONE_KIND_TITLES[kind],
            }))}
            onChange={(event) => {
              const value = event.target.value;
              if (isZoneKind(value)) setKind(value);
            }}
          />
          <Input
            label={texts.zoneName}
            hint={texts.zoneNameHint}
            value={draft.name}
            disabled={sending}
            error={errorFor('name')}
            autoComplete="off"
            onChange={(event) => set('name', event.target.value)}
          />

          {van ? (
            <Select
              label={texts.zoneUser}
              hint={texts.zoneUserHint}
              placeholder={texts.zoneUserPlaceholder}
              value={draft.userId}
              disabled={sending}
              error={errorFor('userId')}
              options={people.map((person) => ({ value: person.id, label: person.name }))}
              onChange={(event) => set('userId', event.target.value)}
            />
          ) : (
            <p className={styles.note}>{texts.zoneUserNone}</p>
          )}

          <Input
            label={texts.zoneSort}
            hint={texts.zoneSortHint}
            value={draft.sort}
            disabled={sending}
            error={errorFor('sort')}
            inputMode="numeric"
            autoComplete="off"
            onChange={(event) => set('sort', event.target.value)}
          />
        </div>

        <div className={styles.actions}>
          {/* Подпись меняется на «Сохраняем…», а не подменяется индикатором:
              видимый текст объясняет состояние точнее крутящегося колечка. */}
          <Button type="submit" size="sm" disabled={sending}>
            {sending ? sendingLabel(editing) : idleLabel(editing)}
          </Button>

          {onCancel === undefined ? null : (
            <Button type="button" size="sm" variant="ghost" disabled={sending} onClick={onCancel}>
              {texts.zoneCancel}
            </Button>
          )}

          {status === 'success' ? (
            <span className={styles.ok} role="status">
              {editing ? texts.zoneSaved : texts.zoneAdded}
            </span>
          ) : null}
        </div>

        {status === 'error' && message !== '' ? (
          <p className={styles.error} role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}

function idleLabel(editing: boolean): string {
  return editing ? texts.zoneSave : texts.zoneAdd;
}

function sendingLabel(editing: boolean): string {
  return editing ? texts.zoneSaving : texts.zoneAdding;
}
