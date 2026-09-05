'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { OrderDetails, OrderStatus } from '@/entities/order/model';
import {
  Alert,
  Badge,
  Button,
  Card,
  FileInput,
  Icon,
  IconButton,
  Textarea,
  buttonClassName,
  useConfirm,
  type Confirm,
} from '@/shared/ui';

import { PHOTO_STAGE_TITLE, orderManagerContent as texts } from './content';
import { installerContent as own, installerWorkTitle } from './installer-content';
import { parseExtraWork, photosLeft } from './installer-model';
import { orderApi, orderWorkApi } from './lib';
import {
  ORDERS_PATH,
  photosOfStage,
  resultDraftOf,
  type OrderApi,
  type OrderFormStatus,
  type OrderPhotoCard,
  type OrderResultDraft,
  type OrderWorkApi,
} from './model';
import styles from './OrderHandover.module.css';

export interface OrderHandoverProps {
  readonly order: OrderDetails;
  /** Итог и снимки. Подменяется в историях и тестах. */
  readonly api?: OrderWorkApi | undefined;
  /** Смена статуса: «Сдать работу» закрывает наряд. */
  readonly statusApi?: OrderApi | undefined;
  readonly onChanged?: (() => void) | undefined;
  readonly confirmRemove?: Confirm | undefined;
}

/** Сторона миниатюры. Числом: `next/image` требует размеры (инвариант 13). */
const THUMB = 148;

/** Почему «Сдать работу» сейчас нельзя. Пусто — можно. */
function whyBlocked(status: OrderStatus, left: number): string | undefined {
  if (status === 'done') return own.blockedByDone;
  if (status !== 'in_progress') return own.blockedByStatus;
  if (left > 0) return own.blockedByPhotos(left);
  return undefined;
}

/** Что говорит карточка оплаты: состояние наряда, а не устройство панели. */
function paymentNote(cash: boolean, price: number | undefined): string {
  if (!cash) return own.paymentCompanyNote;
  if (price === undefined) return own.paymentCashPlain;
  return own.paymentCashNote(price);
}

/**
 * Сдача работы — четвёртый кадр `design/admin/Installer.body.html`, issue #632.
 *
 * 🔴 Раньше монтажник закрывал выезд выпадающим списком статуса, а фото, итог
 * и оплата лежали по трём вкладкам. Экран собирает их вместе: закрыть наряд —
 * это одно действие человека, а не три места, из которых он собирает отчёт по
 * памяти.
 *
 * 🔴 Порядок записи — сначала итог, потом статус. Наоборот было бы хуже:
 * закрытый наряд с пустым отчётом выглядит сданным, а недописанный отчёт при
 * открытом наряде — ровно тем, чем он и является, черновиком.
 *
 * 🔴 Сдать наряд без снимков нельзя, и экран называет остаток числом:
 * «Загрузите ещё 2 фото». Макет писал «нужно 2», и по этой подписи нельзя
 * понять, две сверх загруженной или две всего.
 */
export function OrderHandover({
  order,
  api = orderWorkApi(order.id),
  statusApi = orderApi,
  onChanged,
  confirmRemove,
}: OrderHandoverProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [draft, setDraft] = useState<OrderResultDraft>(() => resultDraftOf(order));
  const [state, setState] = useState<OrderFormStatus>('idle');
  const [saved, setSaved] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const shots = photosOfStage(order.photos, 'after');
  /* 🔴 Сумма приходит монтажнику только при оплате наличными — её нужно
     принять от клиента; в остальных случаях ключа `price` в ответе нет
     вовсе (CRM.md §6, ADR-114). */
  const cash = order.payment === 'cash_to_installer';
  const left = photosLeft(order.photos);
  const breakdown = parseExtraWork(draft.extraWork);
  const sending = state === 'sending';
  const refresh = onChanged ?? ((): void => router.refresh());

  /* 🔴 Отказ объясняется словами и оставляет кнопку в обходе с клавиатуры:
     причина у `Button` включает мягкое отключение вместо нативного. */
  const blocked = whyBlocked(order.status, left);

  const set = (key: keyof OrderResultDraft, value: string): void => {
    setDraft((current) => ({ ...current, [key]: value }));
    setState('idle');
    setSaved(false);
    setMessage('');
  };

  const upload = async (file: File | null): Promise<void> => {
    if (file === null || uploading) return;

    setUploading(true);
    setPhotoError('');

    const result = await api.addPhoto('after', file);
    setUploading(false);

    if (result.ok) {
      refresh();
      return;
    }
    setPhotoError(result.message);
  };

  const remove = async (photo: OrderPhotoCard, index: number): Promise<void> => {
    if (uploading) return;

    const confirmed = await ask({
      title: texts.photoRemoveAsk,
      description: texts.photoRemoveText,
      confirmLabel: texts.photoRemoveConfirm,
    });
    if (!confirmed) return;

    setUploading(true);
    setPhotoError('');

    const result = await api.removePhoto(photo.id);
    setUploading(false);

    if (result.ok) {
      refresh();
      return;
    }
    setPhotoError(`${result.message} (${index + 1})`);
  };

  /** Черновик: итог записан, наряд остаётся в работе. */
  const saveDraft = async (): Promise<void> => {
    if (sending) return;

    setState('sending');
    setMessage('');

    const result = await api.saveResult(draft);

    if (result.ok) {
      setState('success');
      setSaved(true);
      refresh();
      return;
    }

    setState('error');
    setMessage(result.message);
  };

  const submit = async (): Promise<void> => {
    if (sending || blocked !== undefined) return;

    setState('sending');
    setMessage('');

    const written = await api.saveResult(draft);
    if (!written.ok) {
      setState('error');
      setMessage(written.message);
      return;
    }

    const closed = await statusApi.setStatus(order.id, 'done');
    if (!closed.ok) {
      /* Итог уже записан — об этом и сообщаем: повтор не потеряет отчёт. */
      setState('error');
      setSaved(true);
      setMessage(closed.message);
      return;
    }

    setState('success');
    setDone(true);
    refresh();
  };

  return (
    <div className={styles.handover}>
      <header className={styles.head}>
        <h1 className={styles.title}>{own.handoverTitle}</h1>
        {/* 🔴 Номер — та же моноширинная метка, что в наряде дня и в карточке:
            один приём на все три экрана монтажника (issue #633). */}
        <p className={styles.meta}>
          <span className={styles.number}>{texts.number(order.number)}</span>
          <span className={styles.what}>{installerWorkTitle(order)}</span>
        </p>
      </header>

      <Card as="section" className={styles.block} aria-labelledby="handover-photos">
        <div className={styles.blockHead}>
          <h2 className={styles.blockTitle} id="handover-photos">
            {own.photosTitle}
          </h2>
          <Badge variant={left > 0 ? 'warning' : 'success'} size="sm">
            {left > 0 ? own.photosLeft(left) : own.photosReady}
          </Badge>
        </div>

        <p className={styles.hint}>{own.photosHint}</p>

        {shots.length === 0 ? null : (
          <ul className={styles.grid}>
            {shots.map((photo, index) => (
              <li className={styles.shot} key={photo.id}>
                {/* 🔴 `unoptimized` — снимок отдаётся по сессии (ADR-171), а
                    оптимизатор ходит за картинкой своим запросом без cookie
                    панели и получает 401. */}
                <Image
                  className={styles.thumb}
                  src={photo.url}
                  alt={texts.photoAlt(PHOTO_STAGE_TITLE.after, index + 1)}
                  width={THUMB}
                  height={THUMB}
                  unoptimized
                />
                <IconButton
                  className={styles.remove}
                  label={texts.photoRemove(PHOTO_STAGE_TITLE.after, index + 1)}
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  icon={<Icon name="close" size={16} />}
                  onClick={() => void remove(photo, index)}
                />
              </li>
            ))}
          </ul>
        )}

        <FileInput
          label={own.photoAdd}
          promptText={uploading ? own.photoAdding : own.photoAdd}
          disabled={uploading}
          value={null}
          onChange={(file) => void upload(file)}
        />

        {photoError === '' ? null : (
          <p className={styles.error} role="alert">
            {photoError}
          </p>
        )}
      </Card>

      <Card as="section" className={styles.block} aria-labelledby="handover-result">
        <h2 className={styles.blockTitle} id="handover-result">
          {own.resultTitle}
        </h2>

        <Textarea
          label={own.extraWork}
          hint={own.extraWorkHint}
          rows={3}
          value={draft.extraWork}
          disabled={sending}
          onChange={(event) => set('extraWork', event.target.value)}
        />

        {/* 🔴 Разбор читает то же поле, а не второе: полей под эти метры в базе
            нет, и заводить их незачем — смету всё равно правит владелец. Разбор
            существует, чтобы главные числа отчёта было видно сразу. */}
        <div className={styles.breakdown}>
          <span className={styles.breakdownTitle}>{own.breakdownTitle}</span>
          <dl className={styles.tiles}>
            <div className={styles.tile}>
              <dt>{own.breakdownTrassa}</dt>
              <dd>
                {breakdown.trassaM === null ? own.breakdownNone : own.meters(breakdown.trassaM)}
              </dd>
            </div>
            <div className={styles.tile}>
              <dt>{own.breakdownBox}</dt>
              <dd>{breakdown.boxM === null ? own.breakdownNone : own.meters(breakdown.boxM)}</dd>
            </div>
          </dl>
        </div>

        <Textarea
          label={own.report}
          hint={own.reportHint}
          rows={4}
          value={draft.report}
          disabled={sending}
          onChange={(event) => set('report', event.target.value)}
        />
      </Card>

      {/* 🔴 Карточка говорит о состоянии наряда, а не об устройстве панели:
          в макете здесь стояло объяснение, почему монтажнику не видно суммы
          (issue #632). */}
      <Card as="section" className={styles.block} aria-labelledby="handover-payment">
        <div className={styles.blockHead}>
          <h2 className={styles.blockTitle} id="handover-payment">
            {own.paymentTitle}
          </h2>
          <Badge variant={cash ? 'success' : 'neutral'} size="sm">
            {cash ? own.paymentCashMark : own.paymentCompanyMark}
          </Badge>
        </div>

        <p className={styles.paymentMode}>{cash ? own.paymentCash : own.paymentCompany}</p>
        <p className={styles.hint}>{paymentNote(cash, order.price)}</p>
      </Card>

      <div className={styles.bar}>
        {state === 'error' ? (
          <Alert tone="danger" title={message} live="assertive" className={styles.alert} />
        ) : null}

        {done ? (
          <Alert tone="success" title={own.submitted} live="polite" className={styles.alert}>
            {own.submittedNote}
          </Alert>
        ) : null}

        {saved && !done && state !== 'error' ? (
          <p className={styles.note} role="status">
            {own.draftSaved}
          </p>
        ) : null}

        {done ? (
          <Link
            className={buttonClassName({ size: 'lg', fullWidth: true })}
            href={{ pathname: ORDERS_PATH }}
          >
            {own.toOrders}
          </Link>
        ) : (
          <>
            <Button
              size="lg"
              fullWidth
              loading={sending}
              disabled={blocked !== undefined}
              disabledReason={blocked}
              onClick={() => void submit()}
            >
              {sending ? own.submitting : own.submit}
            </Button>

            <Button
              variant="light"
              size="lg"
              fullWidth
              disabled={sending}
              onClick={() => void saveDraft()}
            >
              {sending ? own.draftSaving : own.draft}
            </Button>
          </>
        )}
      </div>

      {dialog}
    </div>
  );
}
