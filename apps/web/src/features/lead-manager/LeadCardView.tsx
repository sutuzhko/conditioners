'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useId, useState } from 'react';

import { LEAD_STATUS_VARIANT } from '@/entities/lead/model';
import {
  CANCEL_REASON_OPTIONS,
  isCancelReason,
  type CancelReason,
} from '@/shared/lib/cancel-reason';
import { formatPhone, phoneHref } from '@/shared/lib/format';
import {
  Alert,
  Badge,
  Button,
  Card,
  Modal,
  Select,
  Textarea,
  useConfirm,
  type Confirm,
} from '@/shared/ui';

import { leadManagerContent as texts } from './content';
import { LeadContextView } from './LeadContextView';
import {
  LEAD_STATUSES,
  isLeadStatus,
  type LeadCard,
  type LeadRemove,
  type LeadStatus,
  type LeadToClient,
  type LeadToOrder,
  type LeadUpdate,
} from './model';
import styles from './LeadCardView.module.css';

export interface LeadCardViewProps {
  readonly lead: LeadCard;
  readonly update: LeadUpdate;
  /** «В клиенты»: заводит карточку человека или находит её по телефону. */
  readonly toClient: LeadToClient;
  /** «Создать заказ»: клиент плюс перевод обращения в работу (CRM.md §3.4). */
  readonly toOrder: LeadToOrder;
  /** 🔴 Уничтожение персональных данных обращения (152-ФЗ, issue #600). */
  readonly remove: LeadRemove;
  /**
   * Куда уходить за черновиком наряда, знает страница: карточка не решает,
   * из какого раздела её открыли, и в Storybook никуда не переходит.
   */
  readonly onOrder?: ((leadId: string) => void) | undefined;
  /** Куда уходить после удаления: обращения больше нет, показывать нечего. */
  readonly onRemoved?: (() => void) | undefined;
  readonly onChanged?: (() => void) | undefined;
  /** Шов для тестов и историй: окно кита подменяется своим ответом (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

/** Поля заявки, которые показываются, только когда заполнены. */
type Detail = { readonly label: string; readonly value: string | null };

/**
 * Карточка заявки: всё, что прислал клиент, плюс статус и заметка менеджера.
 *
 * 🔴 Данные клиента не редактируются: менять чужой телефон в заявке —
 * ровно тот же по смыслу запрет, что и на правку текста отзыва. Менеджер
 * управляет статусом и своей заметкой.
 */
export function LeadCardView({
  lead,
  update,
  toClient,
  toOrder,
  remove,
  onOrder,
  onRemoved,
  onChanged,
  confirmRemove,
}: LeadCardViewProps) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [note, setNote] = useState(lead.managerComment ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [clientId, setClientId] = useState<string | null>(lead.clientId);
  /* Итог действия «В клиенты» держится отдельно от `clientId`: после
     обновления списка тот придёт уже заполненным с сервера, а сказать, завели
     карточку или нашли старую, к этому моменту будет нечем. */
  const [clientOutcome, setClientOutcome] = useState('');
  /* Отдельно от общего `busy`: пока страница открывает черновик наряда,
     карточка остаётся на экране, и кнопка обязана объяснять, что она уже
     нажата, — иначе её нажмут второй раз. */
  const [starting, setStarting] = useState(false);
  /* Разбор отказа: окно открывается вместо молчаливой смены статуса, потому
     что отмена без причины запрещена схемой (ADR-310). */
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState<CancelReason>('client_refused');
  const [cancelNote, setCancelNote] = useState('');
  const [removing, setRemoving] = useState(false);
  const contextId = useId();
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const noteChanged = note !== (lead.managerComment ?? '');
  /** Карточка занята любым из действий: два разом ломают порядок статусов. */
  const locked = busy || starting || removing;

  /** Исход возвращается наружу: без него оптимистичную отметку нечем откатить. */
  const run = async (patch: Parameters<LeadUpdate>[1]): Promise<boolean> => {
    setBusy(true);
    setMessage('');
    setSaved(false);

    const result = await update(lead.id, patch);

    setBusy(false);
    if (result.ok) {
      setSaved(true);
      onChanged?.();
      return true;
    }
    setMessage(result.message ?? texts.serverError);
    return false;
  };

  /**
   * 🔴 Статус ставится сразу, но возвращается назад, если сервер не принял.
   *
   * Без отката на экране оставалось «В работе», а в базе — «Новая»: сообщение
   * об отказе владелец закрывал, селектор показывал новое значение, и заявка
   * оставалась необработанной. Заявка — это деньги владельца (docs/CLAUDE.md,
   * «Миссия проекта»), и потерять её молча дороже, чем показать задержку.
   *
   * Прежнее значение берётся из состояния, а не из `lead.status`: до
   * обновления списка проп остаётся тем, каким пришёл, и откат вернул бы не
   * туда, если статус меняли дважды подряд.
   */
  const changeStatus = async (next: LeadStatus): Promise<void> => {
    const previous = status;
    setStatus(next);

    const ok = await run({ status: next });
    if (!ok) setStatus(previous);
  };

  /**
   * 🔴 Отказ проходит через разбор причины, а не ставится выбором в списке
   * (ADR-310). Схема отклоняет отмену без причины, и молчаливая попытка
   * поставить её селектором закончилась бы отказом сервера, который человек
   * прочитал бы как поломку.
   */
  const confirmCancel = async (): Promise<void> => {
    const previous = status;
    setStatus('rejected');

    const ok = await run({
      status: 'rejected',
      cancelReason: reason,
      cancelNote: cancelNote.trim() === '' ? null : cancelNote.trim(),
    });

    if (ok) {
      setCancelling(false);
      return;
    }
    setStatus(previous);
  };

  /**
   * 🔴 Удаление — уничтожение персональных данных по требованию человека
   * (152-ФЗ, issue #600), и это не то же самое, что отказ: отменённое
   * обращение остаётся в истории, удалённого не остаётся нигде.
   *
   * Подтверждение — окном кита, а не браузера (ADR-113): системное окно
   * выглядит одинаково для «удалить фотографию» и «стереть человека из базы».
   * Отказ от подтверждения не делает ничего.
   */
  const handleRemove = async (): Promise<void> => {
    if (locked) return;
    if (
      !(await ask({
        title: texts.removeConfirmTitle(lead.number),
        description: texts.removeConfirmText,
        confirmLabel: texts.removeConfirmAction,
        cancelLabel: texts.removeCancel,
      }))
    ) {
      return;
    }

    setRemoving(true);
    setMessage('');

    const result = await remove(lead.id);

    if (result.ok) {
      onChanged?.();
      onRemoved?.();
      return;
    }
    setRemoving(false);
    setMessage(result.message ?? texts.serverError);
  };

  /**
   * «В клиенты» — ручное действие, а не следствие приёма заявки: в постоянную
   * базу с адресами попадают те, с кем действительно работают (ADR-105).
   */
  const addToClients = async (): Promise<void> => {
    setBusy(true);
    setMessage('');
    setSaved(false);

    const result = await toClient(lead.id);

    setBusy(false);
    if (result.ok) {
      setClientId(result.clientId);
      setClientOutcome(result.created ? texts.toClientCreated : texts.toClientLinked);
      onChanged?.();
      return;
    }
    setMessage(result.message);
  };

  /**
   * «Создать заказ» — второй мостик из обращения (CRM.md §3.4): клиент
   * заводится или находится по телефону, обращение уходит в работу, а форма
   * наряда открывается уже с адресом, комментарием и угаданным типом работ.
   *
   * Наряд на этом шаге ещё не создан: номер наряда сквозной, и тратить его на
   * промах мимо кнопки нельзя (ADR-114).
   */
  const startOrder = async (): Promise<void> => {
    setStarting(true);
    setMessage('');
    setSaved(false);

    const result = await toOrder(lead.id);

    if (!result.ok) {
      setStarting(false);
      setMessage(result.message);
      return;
    }

    setClientId(result.clientId);
    setStatus(result.status);
    onChanged?.();
    onOrder?.(lead.id);
  };

  const details: readonly Detail[] = [
    { label: texts.topic, value: lead.topic },
    { label: texts.model, value: lead.model },
    { label: texts.place, value: lead.place },
    { label: texts.qty, value: lead.qty },
    { label: texts.callTime, value: lead.callTime },
    { label: texts.address, value: lead.address },
    { label: texts.source, value: lead.sourceUrl },
  ];

  return (
    <Card as="article" className={styles.card}>
      <header className={styles.header}>
        <div>
          {/* Номер стоит над именем: им ссылаются на обращение вслух и в
              заметках, а в очереди по нему же ищут строку. */}
          <p className={styles.number}>{texts.cardNumber(lead.number)}</p>
          <h2 className={styles.name}>{lead.name}</h2>
          {/* 🔴 Телефон ссылкой: заявку обрабатывают звонком, и набирать
              номер руками с экрана — лишний способ ошибиться цифрой. До 600px
              ссылка становится кнопкой «Позвонить»: с телефона по номеру
              звонят, а не читают его (issue #349). Слово стоит в разметке, а
              не в `content` модуля CSS — текст живёт в подписях фичи. */}
          <a className={`${styles.phone} tapAction`} href={phoneHref(lead.phone)}>
            <span className={styles.callWord}>{texts.call}</span>
            {formatPhone(lead.phone)}
          </a>
        </div>

        <div className={styles.headerRight}>
          <Badge variant={LEAD_STATUS_VARIANT[status]}>{texts.statusTitle(status)}</Badge>
          <time className={styles.when} dateTime={lead.createdAt}>
            {texts.when(lead.createdAt)}
          </time>
        </div>
      </header>

      <dl className={styles.details}>
        {details
          .filter((detail): detail is { label: string; value: string } => detail.value !== null)
          .map((detail) => (
            <div className={styles.detail} key={detail.label}>
              <dt className={styles.detailLabel}>{detail.label}</dt>
              <dd className={styles.detailValue}>{detail.value}</dd>
            </div>
          ))}

        {/* 🔴 Факт согласия показывается всегда: он записан в базу, и по
            152-ФЗ его нужно уметь предъявить. */}
        <div className={styles.detail}>
          <dt className={styles.detailLabel}>{texts.consent}</dt>
          <dd className={styles.detailValue}>{texts.consentAt(lead.consentAt)}</dd>
        </div>
      </dl>

      {/* Разбор отказа виден в карточке, а не только в статистике: через
          полгода вопрос «почему не срослось» задают именно здесь. */}
      {lead.cancelReason === null ? null : (
        <Alert tone="info" title={texts.cancelledBy(lead.cancelReason)}>
          {lead.cancelNote ?? undefined}
        </Alert>
      )}

      {lead.comment === null ? null : <p className={styles.comment}>{lead.comment}</p>}

      {lead.photo === null ? null : (
        /* 🔴 `unoptimized` — не забывчивость. Снимок отдаётся по сессии
           (ADR-171), а оптимизатор `next/image` ходит за картинкой сам, своим
           запросом с сервера и без cookie панели: получает 401 и отвечает
           «The requested resource isn't a valid image». Размеры и сам компонент
           остаются — инвариант 13 про сдвиг вёрстки, а не про перекодировку;
           файл уже пережат при загрузке до 1200px. */
        <Image
          className={styles.photo}
          src={lead.photo}
          alt={texts.photo}
          width={220}
          height={220}
          unoptimized
        />
      )}

      {/* Чем человек занимался до формы: расчёт, подбор, отмеченные модели.
          Стоит после того, что он написал сам, — сначала слова, потом следы. */}
      {lead.context === null ? null : (
        <LeadContextView context={lead.context} headingId={contextId} />
      )}

      <div className={styles.actions}>
        <Select
          label={texts.status}
          options={LEAD_STATUSES.map((value) => ({ value, label: texts.statusTitle(value) }))}
          value={status}
          disabled={locked}
          wrapperClassName={styles.statusSelect}
          onChange={(event) => {
            const next = event.target.value;
            if (!isLeadStatus(next)) return;

            /* Отказ — единственный переход с разбором: он открывает окно, а
               не уходит на сервер сразу (ADR-310). */
            if (next === 'rejected') {
              setCancelling(true);
              return;
            }
            void changeStatus(next);
          }}
        />

        <Textarea
          label={texts.managerComment}
          hint={texts.managerCommentHint}
          rows={2}
          value={note}
          disabled={locked}
          className={styles.note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className={styles.footer}>
        {/* 🔴 Главное действие раздела: обращение становится работой. Стоит
            первым и выглядит основной кнопкой — остальные два мостика ведут в
            картотеку и в напоминания, а деньги приносит наряд. */}
        <Button type="button" size="sm" disabled={locked} onClick={() => void startOrder()}>
          {starting ? texts.toOrderBusy : texts.toOrder}
        </Button>

        {/* Из заявки в календарь одним переходом: форма дела открывается уже
            заполненной именем, телефоном и адресом — перебивать их руками
            значит однажды ошибиться в цифре телефона. */}
        <Link
          className={`${styles.plan} tapAction`}
          href={{ pathname: '/admin/crm', query: { lead: lead.id } }}
          prefetch={false}
        >
          {texts.plan}
        </Link>

        {/* Обращение становится карточкой человека в базе клиентов. Действие
            ручное: складывать туда каждого, кто спросил цену, — и лишние
            персональные данные, и список, в котором не найти клиента. */}
        {clientId === null ? (
          <Button
            type="button"
            variant="bordered"
            size="sm"
            disabled={locked}
            onClick={() => void addToClients()}
          >
            {busy ? texts.toClientBusy : texts.toClient}
          </Button>
        ) : (
          <Link
            className={`${styles.plan} tapAction`}
            href={{ pathname: `/admin/clients/${clientId}` }}
            prefetch={false}
          >
            {texts.inBase}
          </Link>
        )}

        {clientOutcome === '' ? null : (
          <p className={styles.savedNote} role="status">
            {clientOutcome}
          </p>
        )}

        {noteChanged ? (
          <Button
            type="button"
            size="sm"
            loading={busy}
            disabled={locked}
            onClick={() => void run({ managerComment: note.trim() === '' ? null : note.trim() })}
          >
            {busy ? texts.saving : texts.saveNote}
          </Button>
        ) : null}

        {saved && !noteChanged ? (
          <p className={styles.savedNote} role="status">
            {texts.saved}
          </p>
        ) : null}

        {message === '' ? null : (
          <p className={styles.error} role="alert">
            {message}
          </p>
        )}
      </div>

      {/* 🔴 Опасная зона отделена от остальных действий чертой и подписью, а
          не стоит четвёртой кнопкой в ряду: удаление уничтожает персональные
          данные навсегда, и промах мимо соседней кнопки стоит истории
          обращения (152-ФЗ, issue #600). */}
      <div className={styles.danger}>
        <p className={styles.dangerHint}>{texts.removeHint}</p>

        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={locked}
          onClick={() => void handleRemove()}
        >
          {removing ? texts.removeBusy : texts.remove}
        </Button>
      </div>

      {/* Разбор причины отказа: окно, а не поле в карточке. Причина
          спрашивается ровно в момент отмены — заранее её никто не заполнит,
          а после отмены заполнять уже некому (ADR-310). */}
      <Modal
        open={cancelling}
        title={texts.cancelTitle}
        onClose={() => {
          setCancelling(false);
          setStatus(lead.status);
        }}
      >
        <div className={styles.cancel}>
          <p className={styles.cancelHint}>{texts.cancelHint}</p>

          <Select
            label={texts.cancelReason}
            options={CANCEL_REASON_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={reason}
            disabled={busy}
            onChange={(event) => {
              const next = event.target.value;
              if (isCancelReason(next)) setReason(next);
            }}
          />

          <Textarea
            label={texts.cancelNote}
            hint={texts.cancelNoteHint}
            rows={3}
            value={cancelNote}
            disabled={busy}
            onChange={(event) => setCancelNote(event.target.value)}
          />

          <div className={styles.cancelActions}>
            <Button type="button" size="sm" loading={busy} onClick={() => void confirmCancel()}>
              {texts.cancelSubmit}
            </Button>

            <Button
              type="button"
              variant="light"
              size="sm"
              disabled={busy}
              onClick={() => {
                setCancelling(false);
                setStatus(lead.status);
              }}
            >
              {texts.cancelBack}
            </Button>
          </div>
        </div>
      </Modal>

      {dialog}
    </Card>
  );
}
