'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useId, useState } from 'react';

import { formatPhone, phoneHref } from '@/shared/lib/format';
import { Badge, Button, Card, Select, Textarea } from '@/shared/ui';

import { leadManagerContent as texts } from './content';
import { LeadContextView } from './LeadContextView';
import {
  LEAD_STATUSES,
  isLeadStatus,
  type LeadCard,
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
  /**
   * Куда уходить за черновиком наряда, знает страница: карточка не решает,
   * из какого раздела её открыли, и в Storybook никуда не переходит.
   */
  readonly onOrder?: ((leadId: string) => void) | undefined;
  readonly onChanged?: (() => void) | undefined;
}

/** Оттенок плашки статуса: новая требует действия, отказ — нет. */
const STATUS_VARIANT: Record<LeadStatus, 'accent' | 'neutral' | 'success' | 'warning'> = {
  new: 'accent',
  in_progress: 'warning',
  done: 'success',
  rejected: 'neutral',
};

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
  onOrder,
  onChanged,
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
  const contextId = useId();

  const noteChanged = note !== (lead.managerComment ?? '');
  /** Карточка занята любым из действий: два разом ломают порядок статусов. */
  const locked = busy || starting;

  const run = async (patch: Parameters<LeadUpdate>[1]): Promise<void> => {
    setBusy(true);
    setMessage('');
    setSaved(false);

    const result = await update(lead.id, patch);

    setBusy(false);
    if (result.ok) {
      setSaved(true);
      onChanged?.();
      return;
    }
    setMessage(result.message ?? texts.serverError);
  };

  const changeStatus = async (next: LeadStatus): Promise<void> => {
    setStatus(next);
    await run({ status: next });
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
          <h2 className={styles.name}>{lead.name}</h2>
          {/* Телефон ссылкой: заявку обрабатывают звонком, и набирать номер
              руками с экрана — лишний способ ошибиться цифрой. */}
          <a className={styles.phone} href={phoneHref(lead.phone)}>
            {formatPhone(lead.phone)}
          </a>
        </div>

        <div className={styles.headerRight}>
          <Badge variant={STATUS_VARIANT[status]}>{texts.statusTitle(status)}</Badge>
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
            if (isLeadStatus(next)) void changeStatus(next);
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
          className={styles.plan}
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
            variant="secondary"
            size="sm"
            disabled={locked}
            onClick={() => void addToClients()}
          >
            {busy ? texts.toClientBusy : texts.toClient}
          </Button>
        ) : (
          <Link
            className={styles.plan}
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
    </Card>
  );
}
