'use client';

import { useState, type FormEvent } from 'react';

import { minutesOfTime } from '@/entities/crm/lib/busy';
import { dayBlockCreateSchema, isDayBlockRepeat } from '@/entities/crm/model';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '@/shared/ui';

import { REPEAT_TITLE, WEEKDAY_TITLE, crmContent as texts } from './content';
import { createBlock, updateBlock } from './lib';
import type { DayBlockDraft } from './model';
import styles from './BlockDialog.module.css';

const REPEAT_OPTIONS = Object.entries(REPEAT_TITLE).map(([value, label]) => ({ value, label }));

const WEEKDAY_OPTIONS = Object.entries(WEEKDAY_TITLE).map(([value, label]) => ({ value, label }));

/** Поля черновика, у которых бывает своя подсказка об ошибке. */
type Errors = Partial<Record<'day' | 'weekday' | 'from' | 'to' | 'reason', string>>;

/** Четыре состояния формы: покой, отправка, успех, отказ. */
type Status = 'idle' | 'sending' | 'success' | 'error';

export interface BlockDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved: () => void;
  readonly draft: DayBlockDraft;
  /** Правка, а не заведение: у существующей занятости известен её номер. */
  readonly id?: string | undefined;
}

/**
 * Окно занятости: «меня в этот день нет».
 *
 * Три вида в одной форме — разовый день, повторяемый по дню недели и окно
 * часов. Разными окнами это разъехалось бы на первой правке, а различий между
 * ними ровно два поля.
 */
export function BlockDialog({ open, onClose, onSaved, draft, id }: BlockDialogProps) {
  const [form, setForm] = useState<DayBlockDraft>(draft);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [failure, setFailure] = useState<string | null>(null);

  // окно живёт в дереве постоянно, а поля должны показывать ту занятость,
  // которую открыли: сравнение по ссылке дешевле, чем эффект на каждый проп
  const [shown, setShown] = useState(draft);
  if (shown !== draft) {
    setShown(draft);
    setForm(draft);
    setErrors({});
    setStatus('idle');
    setFailure(null);
  }

  const set = <Key extends keyof DayBlockDraft>(key: Key, value: DayBlockDraft[Key]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors({});
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (status === 'sending') return;

    /* Та же схема, что на сервере: клиентская проверка — это подсказка, а не
       защита, и вторая её копия рано или поздно разошлась бы с первой. */
    const parsed = dayBlockCreateSchema.safeParse({
      repeat: form.repeat,
      day: form.repeat === 'once' ? form.day : null,
      weekday: form.repeat === 'weekly' ? form.weekday : null,
      fromMin: form.allDay ? null : minutesOfTime(form.from),
      toMin: form.allDay ? null : minutesOfTime(form.to),
      reason: form.reason,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0];
      const message = issue?.message ?? texts.busyFailure;

      // ошибки окна сервер называет по минутам, человек видит поля времени
      if (field === 'day') setErrors({ day: message });
      else if (field === 'weekday') setErrors({ weekday: message });
      else if (field === 'fromMin' || field === 'toMin') setErrors({ to: message });
      else setErrors({ reason: message });

      setStatus('error');
      return;
    }

    setStatus('sending');
    setFailure(null);

    const result = id === undefined ? await createBlock(form) : await updateBlock(id, form);

    if (result.ok) {
      setStatus('success');
      onSaved();
      return;
    }

    setStatus('error');
    setFailure(result.message ?? texts.busyFailure);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={id === undefined ? texts.busyAddTitle : texts.busyEditTitle}
      size="sm"
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.row}>
          <Select
            label={texts.fieldRepeat}
            options={REPEAT_OPTIONS}
            value={form.repeat}
            onChange={(event) => {
              if (isDayBlockRepeat(event.target.value)) set('repeat', event.target.value);
            }}
          />

          {form.repeat === 'once' ? (
            <Input
              label={texts.fieldDay}
              type="date"
              value={form.day}
              onChange={(event) => set('day', event.target.value)}
              error={errors.day}
              required
            />
          ) : (
            <Select
              label={texts.fieldWeekday}
              options={WEEKDAY_OPTIONS}
              value={String(form.weekday)}
              onChange={(event) => set('weekday', Number.parseInt(event.target.value, 10))}
              error={errors.weekday}
            />
          )}
        </div>

        <Checkbox
          label={texts.fieldAllDay}
          checked={form.allDay}
          onChange={(event) => set('allDay', event.target.checked)}
        />

        {/* Окно часов появляется, только когда день закрыт не целиком: два
            пустых поля времени рядом с галочкой «весь день» сбивают с толку. */}
        {form.allDay ? null : (
          <div className={styles.row}>
            <Input
              label={texts.fieldFrom}
              type="time"
              value={form.from}
              onChange={(event) => set('from', event.target.value)}
              error={errors.from}
              required
            />
            <Input
              label={texts.fieldTo}
              type="time"
              value={form.to}
              onChange={(event) => set('to', event.target.value)}
              error={errors.to}
              required
            />
          </div>
        )}

        <Textarea
          label={texts.fieldReason}
          placeholder={texts.fieldReasonPlaceholder}
          hint={texts.fieldReasonHint}
          value={form.reason}
          onChange={(event) => set('reason', event.target.value)}
          error={errors.reason}
          rows={2}
        />

        {status === 'success' ? (
          <p className={styles.success} role="status">
            {texts.busySaved}
          </p>
        ) : null}

        {failure === null ? null : (
          <p className={styles.failure} role="alert">
            {failure}
          </p>
        )}

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={status === 'sending'}>
            {texts.cancel}
          </Button>
          <Button type="submit" loading={status === 'sending'}>
            {status === 'sending' ? texts.saving : texts.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
