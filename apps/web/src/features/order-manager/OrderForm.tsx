'use client';

import { useState, type FormEvent } from 'react';

import { busyAt, busyOn, minutesOfTime } from '@/entities/crm/lib/busy';
import { BusyNote } from '@/entities/crm/ui';
import { formatPhone } from '@/shared/lib/format';
import {
  Button,
  Card,
  Checkbox,
  Input,
  PhoneInput,
  Select,
  Textarea,
  useConfirm,
  type Confirm,
} from '@/shared/ui';

import { OrderUnits } from './OrderUnits';
import {
  DEDUCTION_NOTE,
  ORDER_STATUS_TITLE,
  ORDER_TYPE_TITLE,
  PAYMENT_TITLE,
  orderManagerContent as texts,
} from './content';
import { orderApi } from './lib';
import {
  ORDER_STATUSES,
  ORDER_TYPES,
  PAYMENT_MODES,
  deductionModeOf,
  emptyOrderDraft,
  installerName,
  isOrderField,
  isOrderStatus,
  isOrderType,
  isPaymentMode,
  orderCreateSchema,
  orderPayload,
  type OrderApi,
  type OrderBlock,
  type OrderClientRef,
  type OrderDraft,
  type OrderField,
  type OrderFormStatus,
  type OrderInstallerRef,
} from './model';
import styles from './OrderForm.module.css';

export interface OrderFormProps {
  /** Действия раздела. Подменяются в историях и тестах, чтобы не поднимать сеть. */
  readonly api?: OrderApi | undefined;
  /** Идентификатор заведённого наряда; без него форма заводит новый. */
  readonly orderId?: string | undefined;
  /** Номер наряда — только для подписи в подтверждении удаления. */
  readonly orderNumber?: number | undefined;
  readonly initial?: OrderDraft | undefined;
  /** Списки приходят пропсами: форма ничего не запрашивает сама. */
  readonly clients: readonly OrderClientRef[];
  readonly installers: readonly OrderInstallerRef[];
  /**
   * Занятость всех, кого можно назначить: свои дни человек заводит себе сам
   * (ADR-115). Форма отбирает из них записи выбранного монтажника.
   */
  readonly blocks?: readonly OrderBlock[] | undefined;
  readonly title?: string | undefined;
  readonly hint?: string | undefined;
  /** Номер заведённого наряда — по нему страница уходит в его карточку. */
  readonly onSaved?: ((id: string | null) => void) | undefined;
  readonly removable?: boolean | undefined;
  /**
   * Наряд удалён. Куда уходить дальше, решает страница: форма не знает,
   * открыли её из списка, из календаря или из карточки клиента.
   */
  readonly onRemoved?: (() => void) | undefined;
  /** Подтверждение выведено пропом: тесты и истории не открывают окно. */
  readonly confirm?: Confirm | undefined;
}

type Errors = Partial<Record<OrderField, string>>;

const TYPE_OPTIONS = ORDER_TYPES.map((value) => ({ value, label: ORDER_TYPE_TITLE[value] }));
const STATUS_OPTIONS = ORDER_STATUSES.map((value) => ({ value, label: ORDER_STATUS_TITLE[value] }));
const PAYMENT_OPTIONS = PAYMENT_MODES.map((value) => ({ value, label: PAYMENT_TITLE[value] }));

/**
 * Наряд в правке владельцем — одна форма и на заведение, и на правку.
 *
 * Поля те же, отличается только действие и статус: два компонента означали бы
 * два списка полей, а они разошлись бы на первой же новой строке в наряде.
 *
 * 🔴 Списки клиентов и монтажников приходят пропсами. Форма — представление:
 * она обязана рисоваться в Storybook, где базы нет, и не имеет права ходить
 * в репозиторий (правило зависимостей слоёв).
 */
export function OrderForm({
  api = orderApi,
  orderId,
  orderNumber,
  initial,
  clients,
  installers,
  blocks,
  title,
  hint,
  onSaved,
  removable = false,
  onRemoved,
  confirm,
}: OrderFormProps) {
  const { confirm: ask, dialog } = useConfirm();
  const [draft, setDraft] = useState<OrderDraft>(() => initial ?? emptyOrderDraft());
  const [status, setStatus] = useState<OrderFormStatus>('idle');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [removing, setRemoving] = useState(false);
  const [removed, setRemoved] = useState(false);

  const sending = status === 'sending';
  const busy = sending || removing || removed;
  const editing = orderId !== undefined;
  const askRemove = confirm ?? ask;

  const set = <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
    setMessage('');

    if (!isOrderField(key)) return;
    setErrors((prev) => {
      if (prev[key] === undefined) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;

    /* Клиентская проверка — той же доменной схемой, что и на сервере: это
       мгновенная подсказка, а не защита, и расходиться с сервером ей нельзя. */
    const parsed = orderCreateSchema.safeParse(orderPayload(draft));
    if (!parsed.success) {
      const found: Errors = {};
      let general = '';

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        // первая ошибка поля и остаётся: вторая говорит о том же и только
        // мешает — человек читает подсказку под полем, а не список
        if (isOrderField(field)) {
          if (found[field] === undefined) found[field] = issue.message;
          continue;
        }
        if (general === '') general = issue.message;
      }

      setErrors(found);
      setStatus('error');
      setMessage(general === '' ? texts.invalid : general);
      return;
    }

    setStatus('sending');
    setMessage('');
    setErrors({});

    const result = editing ? await api.update(orderId, draft) : await api.create(draft);

    if (result.ok) {
      /* Заведение очищает форму, правка — оставляет: наряд, который только
         что сохранили, продолжают смотреть. */
      if (!editing) setDraft(emptyOrderDraft());
      setStatus('success');
      onSaved?.(result.id ?? null);
      return;
    }

    setStatus('error');
    const field = result.field;
    if (field !== undefined && isOrderField(field)) {
      setErrors({ [field]: result.message });
      return;
    }
    setMessage(result.message);
  };

  const handleRemove = async (id: string): Promise<void> => {
    if (busy) return;

    const confirmed = await askRemove({
      title: orderNumber === undefined ? texts.removeAsk : texts.removeTitle(orderNumber),
      description: texts.removeText,
      confirmLabel: texts.removeConfirm,
    });
    if (!confirmed) return;

    setRemoving(true);
    setMessage('');

    const result = await api.remove(id);
    setRemoving(false);

    if (result.ok) {
      setRemoved(true);
      onRemoved?.();
      return;
    }

    setStatus('error');
    setMessage(result.message);
  };

  const chosenInstaller =
    installers.find((installer) => installer.id === draft.installerId) ?? null;
  const deduction = deductionModeOf(chosenInstaller);

  /* 🔴 Занятость личная: складывать окна разных людей нельзя — «Дмитрий с 10
     до 12» и «Сергей с 11 до 14» это два занятых человека, а не один занятый
     с 10 до 14 (ADR-115). Поэтому сначала отбор по выбранному монтажнику.

     Пересчитывается на каждый ввод: назначение на закрытый день должно
     предупреждать сразу, а не после отправки. Закрытый целиком день
     предупреждает всегда, отлучка на часы — только когда наряд в них
     попадает: запись к врачу с 14 до 16 не повод мешать ставить монтаж на
     девять утра. */
  const theirs = (blocks ?? []).filter((block) => block.userId === draft.installerId);
  const busyDay = busyOn(draft.day, theirs);
  const conflict = chosenInstaller !== null && busyAt(busyDay, minutesOfTime(draft.time));

  return (
    <Card as="section">
      <form className={styles.form} onSubmit={submit} noValidate>
        <h2 className={styles.title}>{title ?? (editing ? texts.cardTitle : texts.addTitle)}</h2>
        <p className={styles.hint}>{hint ?? (editing ? texts.cardHint : texts.addHint)}</p>

        <fieldset className={styles.group} disabled={busy}>
          <legend className={styles.legend}>{texts.mainTitle}</legend>

          <div className={styles.grid}>
            <Select
              label={texts.type}
              options={TYPE_OPTIONS}
              value={draft.type}
              error={errors.type}
              onChange={(event) => {
                if (isOrderType(event.target.value)) set('type', event.target.value);
              }}
            />

            {/* Статус есть только у заведённого наряда: у нового его назначает
                сервер, а не форма (docs/API.md §13). */}
            {editing ? (
              <Select
                label={texts.status}
                options={STATUS_OPTIONS}
                value={draft.status}
                error={errors.status}
                onChange={(event) => {
                  if (isOrderStatus(event.target.value)) set('status', event.target.value);
                }}
              />
            ) : null}

            <Select
              label={texts.client}
              options={clients.map((client) => ({
                value: client.id,
                label: `${client.name} · ${formatPhone(client.phone)}`,
              }))}
              placeholder={texts.clientPlaceholder}
              value={draft.clientId}
              error={errors.clientId}
              wrapperClassName={styles.wide}
              onChange={(event) => set('clientId', event.target.value)}
            />

            <Select
              label={texts.installer}
              options={[
                { value: '', label: texts.installerPlaceholder },
                ...installers.map((installer) => ({
                  value: installer.id,
                  label: installerName(installer),
                })),
              ]}
              value={draft.installerId}
              error={errors.installerId}
              wrapperClassName={styles.wide}
              onChange={(event) => set('installerId', event.target.value)}
            />

            <Input
              label={texts.day}
              type="date"
              value={draft.day}
              error={errors.day}
              onChange={(event) => set('day', event.target.value)}
            />

            <Input
              label={texts.time}
              type="time"
              value={draft.time}
              error={errors.time}
              onChange={(event) => set('time', event.target.value)}
            />

            <Input
              label={texts.durationField}
              hint={texts.durationHint}
              type="number"
              min={15}
              max={1440}
              step={15}
              inputMode="numeric"
              value={draft.durationMin}
              error={errors.durationMin}
              onChange={(event) => set('durationMin', event.target.value)}
            />
          </div>

          {/* 🔴 Предупреждает, но не запрещает: срочный ремонт в июльскую жару
              важнее запрета, и решение остаётся за владельцем (ADR-115). */}
          {conflict && chosenInstaller !== null ? (
            <BusyNote busy={busyDay} who={installerName(chosenInstaller)} className={styles.busy} />
          ) : null}
        </fieldset>

        <fieldset className={styles.group} disabled={busy}>
          <legend className={styles.legend}>{texts.objectTitle}</legend>

          <div className={styles.grid}>
            <Input
              label={texts.address}
              value={draft.address}
              error={errors.address}
              autoComplete="off"
              wrapperClassName={styles.full}
              onChange={(event) => set('address', event.target.value)}
            />

            <Input
              label={texts.intercom}
              value={draft.intercom}
              error={errors.intercom}
              autoComplete="off"
              onChange={(event) => set('intercom', event.target.value)}
            />

            <PhoneInput
              label={texts.phone2}
              value={draft.phone2}
              error={errors.phone2}
              onChange={(value) => set('phone2', value)}
            />

            <Input
              label={texts.floor}
              type="number"
              min={-5}
              max={100}
              inputMode="numeric"
              value={draft.floor}
              error={errors.floor}
              onChange={(event) => set('floor', event.target.value)}
            />

            <Checkbox
              label={texts.heightWorks}
              checked={draft.heightWorks}
              wrapperClassName={styles.check}
              onChange={(event) => set('heightWorks', event.target.checked)}
            />
          </div>
        </fieldset>

        <OrderUnits units={draft.units} disabled={busy} onChange={(units) => set('units', units)} />

        <fieldset className={styles.group} disabled={busy}>
          <legend className={styles.legend}>{texts.moneyTitle}</legend>

          <div className={styles.grid}>
            <Select
              label={texts.payment}
              options={PAYMENT_OPTIONS}
              value={draft.payment}
              error={errors.payment}
              hint={draft.payment === 'cash_to_installer' ? texts.cashToTakeHint : undefined}
              wrapperClassName={styles.full}
              onChange={(event) => {
                if (isPaymentMode(event.target.value)) set('payment', event.target.value);
              }}
            />

            <Input
              label={texts.price}
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.price}
              error={errors.price}
              onChange={(event) => set('price', event.target.value)}
            />

            <Input
              label={texts.installerFee}
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.installerFee}
              error={errors.installerFee}
              onChange={(event) => set('installerFee', event.target.value)}
            />

            {/* 🔴 «Удержание», а не «штраф»: штрафов как вида взыскания в ТК РФ
                нет, и что запись означает — зависит от оформления человека
                (CRM.md §9). Сумма без основания не записывается. */}
            <Input
              label={texts.deduction}
              hint={texts.deductionHint}
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.deductionSum}
              error={errors.deductionSum}
              onChange={(event) => set('deductionSum', event.target.value)}
            />

            <Input
              label={texts.deductionReason}
              hint={texts.deductionReasonHint}
              value={draft.deductionReason}
              error={errors.deductionReason}
              autoComplete="off"
              required={Number.parseInt(draft.deductionSum, 10) > 0}
              wrapperClassName={styles.wide}
              onChange={(event) => set('deductionReason', event.target.value)}
            />
          </div>

          <p
            className={[styles.note, deduction === 'reduces' ? null : styles.warn]
              .filter(Boolean)
              .join(' ')}
          >
            {DEDUCTION_NOTE[deduction]}
          </p>
        </fieldset>

        <fieldset className={styles.group} disabled={busy}>
          <legend className={styles.legend}>{texts.notesTitle}</legend>

          <div className={styles.grid}>
            <Textarea
              label={texts.comment}
              hint={texts.commentHint}
              rows={3}
              value={draft.comment}
              error={errors.comment}
              wrapperClassName={styles.full}
              onChange={(event) => set('comment', event.target.value)}
            />

            {/* Монтажник её не видит — сервер не кладёт это поле в его ответ. */}
            <Textarea
              label={texts.ownerNote}
              hint={texts.ownerNoteHint}
              rows={3}
              value={draft.ownerNote}
              error={errors.ownerNote}
              wrapperClassName={styles.full}
              onChange={(event) => set('ownerNote', event.target.value)}
            />
          </div>
        </fieldset>

        <div className={styles.actions}>
          <Button type="submit" disabled={busy}>
            {sending ? sendingLabel(editing) : idleLabel(editing)}
          </Button>

          {status === 'success' ? (
            <span className={styles.ok} role="status">
              {editing ? texts.saved : texts.added}
            </span>
          ) : null}

          {removed ? (
            <span className={styles.ok} role="status">
              {texts.removed}
            </span>
          ) : null}

          {removable && editing && !removed ? (
            <Button
              type="button"
              variant="ghost"
              className={styles.remove}
              loading={removing}
              disabled={sending}
              onClick={() => void handleRemove(orderId)}
            >
              {texts.remove}
            </Button>
          ) : null}
        </div>

        {status === 'error' && message !== '' ? (
          <p className={styles.error} role="alert">
            {message}
          </p>
        ) : null}
      </form>

      {dialog}
    </Card>
  );
}

function idleLabel(editing: boolean): string {
  return editing ? texts.save : texts.add;
}

function sendingLabel(editing: boolean): string {
  return editing ? texts.saving : texts.adding;
}
