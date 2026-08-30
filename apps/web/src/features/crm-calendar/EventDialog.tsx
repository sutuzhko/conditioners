'use client';

import { useState, type FormEvent } from 'react';

import { busyAt, busyOn, minutesOfTime } from '@/entities/crm/lib/busy';
import { loadTitle } from '@/entities/crm/content';
import { clashesWith, spanOf } from '@/entities/crm/lib/load';
import { crmEventCreateSchema, isCrmEventKind } from '@/entities/crm/model';
import { BusyNote, ClashNote } from '@/entities/crm/ui';
import { dayKeyOf, minutesOfDay } from '@/shared/lib/calendar';
import { Button, Input, Modal, PhoneInput, Select, Textarea } from '@/shared/ui';

import { KIND_LOOK, ORDER_LOOK, crmContent as texts } from './content';
import { createEvent, updateEvent } from './lib';
import {
  DURATION_STEP_MIN,
  MIN_EVENT_MIN,
  type CalendarOrderCard,
  type CrmEventDraft,
  type DayBlockCard,
} from './model';
import styles from './EventDialog.module.css';

const KIND_OPTIONS = Object.entries(KIND_LOOK).map(([value, look]) => ({
  value,
  label: look.title,
}));

/**
 * Длительность выбором, а не свободным числом.
 *
 * Шаг пятнадцать минут — тот же, что у наряда (ADR-138); список кончается
 * восемью часами: дело длиннее рабочего дня — это уже наряд, а не
 * напоминание. Часы и минуты называются так, как их называет владелец.
 */
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 480].map((minutes) => ({
  value: String(minutes),
  label: loadTitle(minutes),
}));

export interface EventDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved: () => void;
  readonly draft: CrmEventDraft;
  /** Правка, а не создание: у существующего дела известен его номер. */
  readonly id?: string | undefined;
  /**
   * Занятость сетки: форма предупреждает о закрытом дне, но не запрещает
   * сохранить. Срочный ремонт в жару важнее запрета — решает человек.
   */
  readonly blocks?: readonly DayBlockCard[] | undefined;
  /**
   * Наряды сетки: форма предупреждает и о наложении на свой выезд — владелец
   * ездит сам (ADR-114), и звонок на десять утра посреди монтажа он должен
   * увидеть до сохранения, а не в день выезда.
   */
  readonly orders?: readonly CalendarOrderCard[] | undefined;
  /** Кто заводит дело: сравниваются наряды, назначенные ему. */
  readonly viewerId?: string | undefined;
}

type Errors = Partial<Record<keyof CrmEventDraft, string>>;

const DRAFT_FIELDS = [
  'kind',
  'day',
  'time',
  'durationMin',
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
export function EventDialog({
  open,
  onClose,
  onSaved,
  draft,
  id,
  blocks,
  orders,
  viewerId,
}: EventDialogProps) {
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

  /* Пересчитывается на каждый ввод: перенос дела на закрытый день должен
     предупреждать сразу, а не после отправки.

     Закрытый целиком день предупреждает всегда, отлучка на часы — только
     когда дело в них и попадает: запись к врачу с 14 до 16 не повод мешать
     заводить звонок на десять утра. */
  const busy = busyOn(form.day, blocks ?? []);
  const conflict = busyAt(busy, minutesOfTime(form.time));

  /* 🔴 Пересечение предупреждает, а не запрещает (ADR-115): дело сохранится,
     решение за человеком. Сравниваются наряды того же дня и того же человека —
     чужой выезд его планам не мешает. */
  const slot = spanOf(minutesOfTime(form.time), form.durationMin);
  const sameDay = (orders ?? []).filter((order) => dayKeyOf(new Date(order.at)) === form.day);
  const clashes = clashesWith(
    slot,
    viewerId ?? null,
    sameDay.map((order) => ({
      id: order.id,
      ownerId: order.installerId,
      ...spanOf(minutesOfDay(new Date(order.at)), order.durationMin),
    })),
  );

  const clashTitles = clashes.map((clash) => {
    const order = sameDay.find((entry) => entry.id === clash.id);
    const look = order === undefined ? null : ORDER_LOOK[order.type];

    return [
      texts.orderMark(order?.number ?? 0),
      look === null ? null : look.title.toLocaleLowerCase('ru-RU'),
      order?.clientName,
    ]
      .filter((part) => part !== null && part !== undefined && part !== '')
      .join(' · ');
  });

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
          {/* 🔴 Длительность — путь к тому же, что делает растягивание края
              мышью: ускоритель не может быть единственным способом (ADR-128). */}
          <Select
            label={texts.fieldDuration}
            options={DURATION_OPTIONS}
            value={String(form.durationMin)}
            onChange={(event) => {
              const minutes = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(minutes) && minutes >= MIN_EVENT_MIN) {
                set('durationMin', minutes - (minutes % DURATION_STEP_MIN));
              }
            }}
            wrapperClassName={styles.time}
          />
        </div>

        {conflict ? <BusyNote busy={busy} /> : null}

        <ClashNote items={clashTitles} />

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
          <Button type="button" variant="light" onClick={onClose} disabled={sending}>
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
