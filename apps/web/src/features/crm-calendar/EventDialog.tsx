'use client';

import { useState, type FormEvent } from 'react';

import { crmEventCreateSchema, isCrmEventKind } from '@/entities/crm/model';
import { Button, Input, Modal, PhoneInput, Select, Textarea } from '@/shared/ui';

import { KIND_LOOK, crmContent as texts } from './content';
import { createEvent, updateEvent } from './lib';
import type { CrmEventDraft } from './model';
import styles from './EventDialog.module.css';

const KIND_OPTIONS = Object.entries(KIND_LOOK).map(([value, look]) => ({
  value,
  label: look.title,
}));

export interface EventDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved: () => void;
  readonly draft: CrmEventDraft;
  /** Правка, а не создание: у существующего дела известен его номер. */
  readonly id?: string | undefined;
}

type Errors = Partial<Record<keyof CrmEventDraft, string>>;

const DRAFT_FIELDS = [
  'kind',
  'day',
  'time',
  'clientName',
  'clientPhone',
  'address',
  'note',
  'leadId',
] as const;

/** Путь ошибки Zod — произвольный ключ; полем формы его делает эта проверка. */
function isDraftField(value: unknown): value is keyof CrmEventDraft {
  return typeof value === 'string' && DRAFT_FIELDS.some((field) => field === value);
}

/**
 * Окно дела: и заведение, и правка.
 *
 * Одно окно на оба случая намеренно — поля те же, а две почти одинаковые
 * формы разъезжаются при первой же правке.
 */
export function EventDialog({ open, onClose, onSaved, draft, id }: EventDialogProps) {
  const [form, setForm] = useState<CrmEventDraft>(draft);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // окно живёт в дереве постоянно, а поля должны показывать то дело, которое
  // открыли: сравнение по ключу дешевле, чем эффект на каждый проп
  const [shown, setShown] = useState(draft);
  if (shown !== draft) {
    setShown(draft);
    setForm(draft);
    setErrors({});
    setFailure(null);
  }

  const set = <Key extends keyof CrmEventDraft>(key: Key, value: CrmEventDraft[Key]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    const parsed = crmEventCreateSchema.safeParse(form);
    if (!parsed.success) {
      const found: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        // первая ошибка поля и остаётся: вторая говорит о том же и только
        // мешает — человек читает подсказку под полем, а не список
        if (isDraftField(field) && found[field] === undefined) found[field] = issue.message;
      }
      setErrors(found);
      return;
    }

    setSending(true);
    setFailure(null);

    const result = id === undefined ? await createEvent(form) : await updateEvent(id, form);
    setSending(false);

    if (result.ok) {
      onSaved();
      return;
    }
    setFailure(result.message ?? texts.failure);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={id === undefined ? texts.addTitle : texts.editTitle}
      size="md"
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.row}>
          <Select
            label={texts.fieldKind}
            options={KIND_OPTIONS}
            value={form.kind}
            onChange={(event) => {
              if (isCrmEventKind(event.target.value)) set('kind', event.target.value);
            }}
            wrapperClassName={styles.kind}
          />
          <Input
            label={texts.fieldDay}
            type="date"
            value={form.day}
            onChange={(event) => set('day', event.target.value)}
            error={errors.day}
            required
          />
          <Input
            label={texts.fieldTime}
            type="time"
            value={form.time}
            onChange={(event) => set('time', event.target.value)}
            error={errors.time}
            wrapperClassName={styles.time}
            required
          />
        </div>

        <div className={styles.row}>
          <Input
            label={texts.fieldName}
            placeholder={texts.fieldNamePlaceholder}
            value={form.clientName}
            onChange={(event) => set('clientName', event.target.value)}
            error={errors.clientName}
            autoComplete="off"
            required
          />
          <PhoneInput
            label={texts.fieldPhone}
            value={form.clientPhone}
            onChange={(value) => set('clientPhone', value)}
            error={errors.clientPhone}
          />
        </div>

        <Input
          label={texts.fieldAddress}
          value={form.address}
          onChange={(event) => set('address', event.target.value)}
          error={errors.address}
          autoComplete="off"
        />

        <Textarea
          label={texts.fieldNote}
          placeholder={texts.fieldNotePlaceholder}
          value={form.note}
          onChange={(event) => set('note', event.target.value)}
          error={errors.note}
          rows={3}
        />

        {failure === null ? null : (
          <p className={styles.failure} role="alert">
            {failure}
          </p>
        )}

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={sending}>
            {texts.cancel}
          </Button>
          <Button type="submit" loading={sending}>
            {sending ? texts.saving : texts.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
