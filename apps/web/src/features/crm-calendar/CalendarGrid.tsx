import Link from 'next/link';

import { blocksOn, busyOn, type DayBusy } from '@/entities/crm/lib/busy';
import type { PersonTone } from '@/entities/crm/lib/palette';
import { busyTitle, busyWindowTitle, crmBusyContent } from '@/entities/crm/content';
import { formatDate } from '@/shared/lib/format';
import { type DayKey, type MonthKey, dayKeyOf, monthGrid, timeOf } from '@/shared/lib/calendar';
import { Icon } from '@/shared/ui';

import { KIND_LOOK, ORDER_LOOK, WEEKDAYS, crmContent as texts } from './content';
import type { CalendarLead, CalendarOrderCard, CrmEventCard, DayBlockCard } from './model';
import styles from './CalendarGrid.module.css';

/** Сколько дел помещается в ячейку до того, как остаток свернётся в «+N». */
const VISIBLE = 3;

export interface CalendarGridProps {
  readonly month: MonthKey;
  readonly selected: DayKey;
  readonly today: DayKey;
  readonly events: readonly CrmEventCard[];
  /**
   * Наряды месяца — CRM.md §3.5: у монтажника календарь это его выезды.
   * 🔴 В ячейке они отличимы от дел не только цветом: у наряда есть номер и
   * сплошная полоса слева, у дела — пунктирная (ADR-093).
   */
  readonly orders?: readonly CalendarOrderCard[] | undefined;
  readonly leads: readonly CalendarLead[];
  /** Занятость всей сетки: какая ляжет на конкретный день, решает домен. */
  readonly blocks: readonly DayBlockCard[];
  /** Кто смотрит: своя занятость закрывает ему день, чужая — только сообщается. */
  readonly viewerId: string;
  /**
   * Занятость команды по дням — включённый переключатель «Занятость
   * монтажников» (ADR-123). В месяце часов нет, и рисовать их в клетке дня
   * незачем: занятость показывается компактными полосками по людям —
   * «в этот день занят Дмитрий и Сергей».
   */
  readonly teamLoad?: ReadonlyMap<DayKey, readonly TeamDayMark[]> | undefined;
}

/** Полоска человека в клетке дня: краска, инициалы и подпись словами. */
export type TeamDayMark = {
  readonly id: string;
  readonly title: string;
  readonly initials: string;
  readonly tone: PersonTone;
  /** «Занят 10:00–13:00» или «День закрыт» — то же, что скажет скринридер. */
  readonly note: string;
};

/**
 * Краска человека → класс модуля. Прямой перевод, а не сборка имени строкой:
 * так линтер видит, что все шесть классов используются.
 */
const PERSON_CLASS: Record<PersonTone, string> = {
  a: styles.personA ?? '',
  b: styles.personB ?? '',
  c: styles.personC ?? '',
  d: styles.personD ?? '',
  e: styles.personE ?? '',
  f: styles.personF ?? '',
};

type DayBucket = { events: CrmEventCard[]; orders: CalendarOrderCard[]; leads: number };

function bucketsOf(
  events: readonly CrmEventCard[],
  orders: readonly CalendarOrderCard[],
  leads: readonly CalendarLead[],
): Map<DayKey, DayBucket> {
  const buckets = new Map<DayKey, DayBucket>();

  const bucket = (day: DayKey): DayBucket => {
    const ready = buckets.get(day);
    if (ready !== undefined) return ready;

    const fresh: DayBucket = { events: [], orders: [], leads: 0 };
    buckets.set(day, fresh);
    return fresh;
  };

  // наряды идут первыми: выезд с деньгами и исполнителем важнее напоминания
  for (const order of orders) bucket(dayKeyOf(new Date(order.at))).orders.push(order);
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
  team: readonly TeamDayMark[],
): string {
  const date = formatDate(`${day}T00:00:00.000Z`);

  const parts = [
    busy.state === 'free' ? null : busyTitle(busy),
    team.length === 0
      ? null
      : team.map((mark) => `${mark.title} — ${mark.note.toLocaleLowerCase('ru-RU')}`).join('; '),
    others.length === 0 || team.length > 0 ? null : texts.busyOthers(others.join(', ')),
    (bucket?.orders.length ?? 0) > 0 ? texts.ordersCount(bucket?.orders.length ?? 0) : null,
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
  orders = [],
  leads,
  blocks,
  viewerId,
  teamLoad,
}: CalendarGridProps) {
  const weeks = monthGrid(month);
  const buckets = bucketsOf(events, orders, leads);

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
          const team = teamLoad?.get(day.key) ?? [];
          const bucket = buckets.get(day.key);
          const orderShown = bucket?.orders.slice(0, VISIBLE) ?? [];
          const eventShown = bucket?.events.slice(0, VISIBLE - orderShown.length) ?? [];
          const rest =
            (bucket?.orders.length ?? 0) +
            (bucket?.events.length ?? 0) -
            orderShown.length -
            eventShown.length;
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
              aria-label={cellLabel(day.key, bucket, busy, others, team)}
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

                {/* Занятость команды: полоска на человека, краска закреплена
                    за ним, инициалы стоят рядом с краской (ADR-123). Часов в
                    клетке месяца нет и рисовать их тут незачем. */}
                {team.map((mark) => (
                  <span
                    className={`${styles.person} ${PERSON_CLASS[mark.tone]}`}
                    key={mark.id}
                    title={`${mark.title} — ${mark.note.toLocaleLowerCase('ru-RU')}`}
                  >
                    <span className={styles.personWho}>{mark.initials}</span>
                    <span className={styles.busyText}>{mark.title}</span>
                  </span>
                ))}

                {/* Чужая занятость именем, а не промежутком: владельцу важно
                    «Дмитрия в четверг нет», а часы он посмотрит в дне.
                    При включённом наложении её заменяют полоски выше. */}
                {others.length === 0 || team.length > 0 ? null : (
                  <span className={`${styles.busy} ${styles.busyOthers}`}>
                    <Icon
                      className={styles.busyIcon}
                      name={othersWhole ? 'danger' : 'clock'}
                      size={12}
                    />
                    <span className={styles.busyText}>{others.join(', ')}</span>
                  </span>
                )}

                {/* Наряд — ссылка в свою карточку прямо из ячейки: он
                    правится в своём разделе, а не в панели дня (ADR-093).
                    Ссылка внутри ссылки недопустима, поэтому здесь метка, а
                    переход в наряд — из панели дня и из сетки часов. */}
                {orderShown.map((order) => (
                  <span
                    className={[
                      styles.mark,
                      styles.order,
                      styles[ORDER_LOOK[order.type].tone],
                      order.status === 'done' ? styles.markDone : null,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={order.id}
                  >
                    <span className={styles.markTime}>{`№${order.number}`}</span>
                    <span className={styles.markName}>{order.clientName}</span>
                  </span>
                ))}

                {eventShown.map((event) => (
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
