'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { CrmEventStatus } from '@/entities/crm/model';
import { formatDate } from '@/shared/lib/format';
import { type DayKey, dayKeyOf, timeOf } from '@/shared/lib/calendar';
import { Button, Icon } from '@/shared/ui';

import { EventDialog } from './EventDialog';
import { KIND_LOOK, STATUS_TITLE, crmContent as texts } from './content';
import { removeEvent, setEventStatus } from './lib';
import type { CalendarLead, CrmEventCard, CrmEventDraft } from './model';
import styles from './DayPanel.module.css';

/** Время по умолчанию у нового дела: рабочий день начинается с утра. */
const DEFAULT_TIME = '10:00';

export interface DayPanelProps {
  readonly day: DayKey;
  readonly events: readonly CrmEventCard[];
  readonly leads: readonly CalendarLead[];
  /**
   * Заготовка из заявки: панель открывается с уже заполненной формой, когда
   * на неё пришли по кнопке «В календарь» из раздела заявок.
   */
  readonly preset?: Partial<CrmEventDraft> | undefined;
}

function emptyDraft(day: DayKey, preset?: Partial<CrmEventDraft>): CrmEventDraft {
  return {
    kind: 'call',
    day,
    time: DEFAULT_TIME,
    clientName: '',
    clientPhone: '',
    address: '',
    note: '',
    leadId: null,
    ...preset,
  };
}

function draftOf(event: CrmEventCard): CrmEventDraft {
  const at = new Date(event.at);

  return {
    kind: event.kind,
    day: dayKeyOf(at),
    time: timeOf(at),
    clientName: event.clientName,
    clientPhone: event.clientPhone ?? '',
    address: event.address ?? '',
    note: event.note ?? '',
    leadId: event.leadId,
  };
}

/**
 * День целиком: что запланировано и какие заявки пришли.
 *
 * Клиентский компонент — здесь живут действия. Сами данные приходят с сервера
 * пропсами: список дня виден в исходном HTML, а не собирается запросом.
 */
export function DayPanel({ day, events, leads, preset }: DayPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CrmEventDraft | null>(
    preset === undefined ? null : emptyDraft(day, preset),
  );
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const openNew = (): void => {
    setEditing(undefined);
    setDraft(emptyDraft(day));
  };

  const openEdit = (event: CrmEventCard): void => {
    setEditing(event.id);
    setDraft(draftOf(event));
  };

  const close = (): void => {
    setDraft(null);
    setEditing(undefined);

    // окно, открытое из заявки, оставляло бы `?lead=` в адресе — и всплывало
    // снова при каждом обновлении страницы
    if (preset !== undefined) router.replace(`/admin/crm?day=${day}`);
  };

  const saved = (): void => {
    close();
    router.refresh();
  };

  const move = async (id: string, status: CrmEventStatus): Promise<void> => {
    setBusy(id);
    setFailure(null);

    const result = await setEventStatus(id, status);
    setBusy(null);

    if (result.ok) router.refresh();
    else setFailure(result.message ?? texts.failure);
  };

  const drop = async (id: string): Promise<void> => {
    if (!window.confirm(texts.removeConfirm)) return;

    setBusy(id);
    setFailure(null);

    const result = await removeEvent(id);
    setBusy(null);

    if (result.ok) router.refresh();
    else setFailure(result.message ?? texts.removeFailure);
  };

  return (
    <section className={styles.panel} aria-label={formatDate(`${day}T00:00:00.000Z`)}>
      <header className={styles.header}>
        <h2 className={styles.title}>{formatDate(`${day}T00:00:00.000Z`)}</h2>
        <Button size="sm" onClick={openNew} iconStart={<Icon name="plus" />}>
          {texts.addShort}
        </Button>
      </header>

      {failure === null ? null : (
        <p className={styles.failure} role="alert">
          {failure}
        </p>
      )}

      {events.length === 0 && leads.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{texts.dayEmpty}</p>
          <p className={styles.emptyText}>{texts.dayEmptyHint}</p>
        </div>
      ) : null}

      {events.length === 0 ? null : (
        <ul className={styles.list}>
          {events.map((event) => {
            const look = KIND_LOOK[event.kind];

            return (
              <li
                className={[
                  styles.item,
                  styles[look.tone],
                  event.status === 'done' ? styles.done : null,
                  event.status === 'cancelled' ? styles.cancelled : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={event.id}
              >
                <div className={styles.when}>
                  <span className={styles.time}>{timeOf(new Date(event.at))}</span>
                  <span className={styles.kind}>
                    <Icon name={look.icon} className={styles.kindIcon} />
                    {look.title}
                  </span>
                </div>

                <div className={styles.about}>
                  <p className={styles.name}>{event.clientName}</p>

                  {event.clientPhone === null ? null : (
                    <a className={styles.phone} href={`tel:${event.clientPhone}`}>
                      {event.clientPhone}
                    </a>
                  )}

                  {event.address === null ? null : (
                    <p className={styles.address}>{event.address}</p>
                  )}

                  {event.note === null ? null : <p className={styles.note}>{event.note}</p>}

                  {event.status === 'planned' ? null : (
                    <p className={styles.status}>{STATUS_TITLE[event.status]}</p>
                  )}

                  {event.leadId === null ? null : (
                    <Link
                      className={styles.fromLead}
                      href={{ pathname: '/admin/leads' }}
                      prefetch={false}
                    >
                      {texts.fromLead}
                    </Link>
                  )}
                </div>

                <div className={styles.actions}>
                  {event.status === 'planned' ? (
                    <button
                      className={styles.action}
                      type="button"
                      onClick={() => void move(event.id, 'done')}
                      disabled={busy === event.id}
                    >
                      {texts.markDone}
                    </button>
                  ) : (
                    <button
                      className={styles.action}
                      type="button"
                      onClick={() => void move(event.id, 'planned')}
                      disabled={busy === event.id}
                    >
                      {texts.markPlanned}
                    </button>
                  )}

                  {event.status === 'cancelled' ? null : (
                    <button
                      className={styles.action}
                      type="button"
                      onClick={() => void move(event.id, 'cancelled')}
                      disabled={busy === event.id}
                    >
                      {texts.markCancelled}
                    </button>
                  )}

                  <button className={styles.action} type="button" onClick={() => openEdit(event)}>
                    {texts.edit}
                  </button>

                  <button
                    className={`${styles.action} ${styles.danger}`}
                    type="button"
                    onClick={() => void drop(event.id)}
                    disabled={busy === event.id}
                  >
                    {texts.remove}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {leads.length === 0 ? null : (
        <section className={styles.leads}>
          <h3 className={styles.leadsTitle}>{texts.leadsTitle}</h3>

          <ul className={styles.leadList}>
            {leads.map((lead) => (
              <li className={styles.leadItem} key={lead.id}>
                <span className={styles.time}>{timeOf(new Date(lead.at))}</span>
                <span className={styles.leadName}>{lead.name}</span>
                <span className={styles.leadTopic}>{lead.topic}</span>
                <a className={styles.phone} href={`tel:${lead.phone}`}>
                  {lead.phone}
                </a>
                <Link
                  className={styles.leadLink}
                  href={{ pathname: '/admin/leads' }}
                  prefetch={false}
                >
                  {texts.leadLink}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {draft === null ? null : (
        <EventDialog open onClose={close} onSaved={saved} draft={draft} id={editing} />
      )}
    </section>
  );
}
