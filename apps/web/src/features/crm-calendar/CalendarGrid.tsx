import Link from 'next/link';

import { blocksOn, busyOn, type DayBusy } from '@/entities/crm/lib/busy';
import { busyTitle, busyWindowTitle, crmBusyContent } from '@/entities/crm/content';
import { formatDate } from '@/shared/lib/format';
import { type DayKey, type MonthKey, dayKeyOf, monthGrid, timeOf } from '@/shared/lib/calendar';
import { Icon } from '@/shared/ui';

import { KIND_LOOK, WEEKDAYS, crmContent as texts } from './content';
import type { CalendarLead, CrmEventCard, DayBlockCard } from './model';
import styles from './CalendarGrid.module.css';

/** Сколько дел помещается в ячейку до того, как остаток свернётся в «+N». */
const VISIBLE = 3;

export interface CalendarGridProps {
  readonly month: MonthKey;
  readonly selected: DayKey;
  readonly today: DayKey;
  readonly events: readonly CrmEventCard[];
  readonly leads: readonly CalendarLead[];
  /** Занятость всей сетки: какая ляжет на конкретный день, решает домен. */
  readonly blocks: readonly DayBlockCard[];
  /** Кто смотрит: своя занятость закрывает ему день, чужая — только сообщается. */
  readonly viewerId: string;
}

type DayBucket = { events: CrmEventCard[]; leads: number };

function bucketsOf(
  events: readonly CrmEventCard[],
  leads: readonly CalendarLead[],
): Map<DayKey, DayBucket> {
  const buckets = new Map<DayKey, DayBucket>();

  const bucket = (day: DayKey): DayBucket => {
    const ready = buckets.get(day);
    if (ready !== undefined) return ready;

    const fresh: DayBucket = { events: [], leads: 0 };
    buckets.set(day, fresh);
    return fresh;
  };

  for (const event of events) bucket(dayKeyOf(new Date(event.at))).events.push(event);
  for (const lead of leads) bucket(dayKeyOf(new Date(lead.at))).leads += 1;

  return buckets;
}

/**
 * Подпись ячейки для скринридера: голое число дня о дате ничего не говорит.
 *
 * Занятость называется словами, а не остаётся цветом рамки: закрытый день —
 * первое, что нужно знать о дне, и узнать это обязан не только зрячий.
 */
function cellLabel(
  day: DayKey,
  bucket: DayBucket | undefined,
  busy: DayBusy,
  others: readonly string[],
): string {
  const date = formatDate(`${day}T00:00:00.000Z`);

  const parts = [
    busy.state === 'free' ? null : busyTitle(busy),
    others.length === 0 ? null : texts.busyOthers(others.join(', ')),
    (bucket?.events.length ?? 0) > 0 ? texts.eventsCount(bucket?.events.length ?? 0) : null,
    (bucket?.leads ?? 0) > 0 ? texts.leadsCount(bucket?.leads ?? 0) : null,
  ].filter(Boolean);

  return parts.length === 0 ? date : `${date}, ${parts.join(', ')}`;
}

/**
 * Сетка месяца.
 *
 * Серверный компонент: страница панели обязана приходить готовой, а листание
 * месяцев сделано ссылками — открытый месяц можно вернуть из закладок и
 * переслать ссылкой мастеру.
 *
 * Разметка намеренно без ролей `grid`: ячейка здесь — ссылка, и роль
 * `gridcell` поверх неё отобрала бы у скринридера единственное важное
 * сообщение — что по ней можно перейти.
 */
export function CalendarGrid({
  month,
  selected,
  today,
  events,
  leads,
  blocks,
  viewerId,
}: CalendarGridProps) {
  const weeks = monthGrid(month);
  const buckets = bucketsOf(events, leads);

  /* 🔴 Занятость личная, и окна разных людей не складываются: свою смотрящий
     видит промежутками, чужую — именами. Разделение делается один раз, а не
     на каждой из сорока двух ячеек. */
  const mine = blocks.filter((block) => block.userId === viewerId);
  const foreign = blocks.filter((block) => block.userId !== viewerId);

  return (
    <div className={styles.grid}>
      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((title) => (
          <span className={styles.weekday} key={title}>
            {title}
          </span>
        ))}
      </div>

      <div className={styles.days}>
        {weeks.flat().map((day) => {
          const bucket = buckets.get(day.key);
          const shown = bucket?.events.slice(0, VISIBLE) ?? [];
          const rest = (bucket?.events.length ?? 0) - shown.length;
          const busy = busyOn(day.key, mine);
          const foreignHere = blocksOn(day.key, foreign);
          const others = [
            ...new Set(foreignHere.map((block) => block.userName).filter((name) => name !== null)),
          ];
          // хотя бы у одного день закрыт целиком — иначе это отлучка на часы
          const othersWhole = foreignHere.some((block) => block.fromMin === null);

          const marks = [
            day.inMonth ? null : styles.outside,
            /* 🔴 Выходных сетка не назначает: их отмечает человек занятостью.
               Закрытый целиком день и отлучка на часы — разное оформление:
               день, закрытый на два часа, остаётся рабочим. */
            busy.state === 'full' ? styles.busyFull : null,
            busy.state === 'partial' ? styles.busyPartial : null,
            day.key === today ? styles.today : null,
            day.key === selected ? styles.selected : null,
          ].filter(Boolean);

          return (
            <Link
              className={[styles.cell, ...marks].join(' ')}
              key={day.key}
              href={{ pathname: '/admin/crm', query: { month, day: day.key } }}
              aria-label={cellLabel(day.key, bucket, busy, others)}
              aria-current={day.key === selected ? 'date' : undefined}
            >
              <span className={styles.number} aria-hidden="true">
                {day.day}
              </span>

              <span className={styles.marks} aria-hidden="true">
                {busy.state === 'free' ? null : (
                  <span
                    className={[
                      styles.busy,
                      busy.state === 'full' ? styles.busyWhole : styles.busyWindow,
                    ].join(' ')}
                  >
                    {/* значок, а не только цвет: занятость обязана читаться и
                        дальтоником, и в свёрнутой ячейке телефона */}
                    <Icon
                      className={styles.busyIcon}
                      name={busy.state === 'full' ? 'danger' : 'clock'}
                      size={12}
                    />
                    <span className={styles.busyText}>
                      {busy.state === 'full'
                        ? crmBusyContent.fullShort
                        : busyWindowTitle(
                            busy.windows[0]?.fromMin ?? 0,
                            busy.windows[0]?.toMin ?? 0,
                          )}
                    </span>
                  </span>
                )}

                {/* Чужая занятость именем, а не промежутком: владельцу важно
                    «Дмитрия в четверг нет», а часы он посмотрит в дне. */}
                {others.length === 0 ? null : (
                  <span className={`${styles.busy} ${styles.busyOthers}`}>
                    <Icon
                      className={styles.busyIcon}
                      name={othersWhole ? 'danger' : 'clock'}
                      size={12}
                    />
                    <span className={styles.busyText}>{others.join(', ')}</span>
                  </span>
                )}

                {shown.map((event) => (
                  <span
                    className={[
                      styles.mark,
                      styles[KIND_LOOK[event.kind].tone],
                      event.status === 'done' ? styles.markDone : null,
                      event.status === 'cancelled' ? styles.markCancelled : null,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={event.id}
                  >
                    <span className={styles.markTime}>{timeOf(new Date(event.at))}</span>
                    <span className={styles.markName}>{event.clientName}</span>
                  </span>
                ))}

                {rest > 0 ? <span className={styles.more}>{texts.moreEvents(rest)}</span> : null}

                {bucket === undefined || bucket.leads === 0 ? null : (
                  <span className={styles.lead}>{texts.leadsCount(bucket.leads)}</span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
