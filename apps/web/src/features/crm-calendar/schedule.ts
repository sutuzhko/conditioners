/**
 * Раскладка календаря по часам: неделя и день, с наложением занятости команды.
 *
 * Здесь данные превращаются в колонки с местами: что показывать в сетке, где
 * оно стоит по времени и что с чем спорит. 🔴 Чистые функции — сетка часов
 * плотная, и проверять её глазами на каждой правке нельзя; всё, что можно
 * посчитать, считается тут и покрывается тестами.
 *
 * 🔴 Занятость команды ложится на ту же сетку наложением, а не колонкой на
 * человека (ADR-123): владелец назначает наряд, глядя на всю команду разом, а
 * не перебирая людей по очереди. Каждый идёт своим закреплённым цветом, и
 * рядом с цветом всегда стоят инициалы.
 *
 * 🔴 Всё время — московское, через `shared/lib/calendar` (ADR-080): контейнер
 * живёт в UTC, и прямой `getHours()` уводил бы сетку на три часа.
 */
import { blocksOn, busyOn, timeOfMinutes, type DayBusy } from '@/entities/crm/lib/busy';
import { initialsOf, personTone, type PersonTone } from '@/entities/crm/lib/palette';
import {
  clashingIds,
  laneOf,
  loadMinutes,
  spanOf,
  type Booking,
  type Placed,
  type TimeSpan,
} from '@/entities/crm/lib/load';
import {
  busyTitle,
  busyWindowTitle,
  crmBusyContent,
  crmClashContent,
} from '@/entities/crm/content';
import { staffTitle } from '@/entities/staff/model';
import {
  type DayKey,
  dayKeyOf,
  minutesOfDay,
  timeOf,
  weekGrid,
  weekdayOf,
} from '@/shared/lib/calendar';
import type { IconName } from '@/shared/ui';

import {
  KIND_LOOK,
  ORDER_LOOK,
  ORDER_STATUS_TITLE,
  STATUS_TITLE,
  WEEKDAYS,
  crmContent as texts,
} from './content';
import type { CalendarLead, CalendarOrderCard, CrmEventCard, DayBlockCard } from './model';

/**
 * Сколько места занимает в сетке дело и заявка.
 *
 * У дела длительности нет: «перезвонить Ирине» — это отметка на часах, а не
 * работа с началом и концом. Получасовой слот выбран как наименьший, в
 * котором подпись ещё читается; в подсчёт загрузки и в поиск пересечений он не
 * идёт — там участвуют только наряды, у которых длительность настоящая.
 */
export const EVENT_SLOT_MIN = 30;

/** Рабочее окно по умолчанию: сетка начинается с восьми и кончается в восемь. */
const DEFAULT_FROM_MIN = 8 * 60;
const DEFAULT_TO_MIN = 20 * 60;

const MINUTES_IN_HOUR = 60;
const MINUTES_IN_DAY = 24 * 60;

export type ScheduleTone =
  'call' | 'measure' | 'install' | 'service' | 'meeting' | 'note' | 'repair';

/**
 * Человек в наложении занятости: цвет закреплён за ним, инициалы стоят рядом
 * с цветом, полное имя уходит в подпись для скринридера (ADR-123).
 */
export type SchedulePersonMark = {
  readonly id: string;
  readonly title: string;
  readonly initials: string;
  readonly tone: PersonTone;
};

/**
 * Запись в сетке. 🔴 Наряд и дело — разные сущности с разным смыслом
 * (ADR-093), и `entity` их разводит: у наряда есть номер и своя карточка, дело
 * открывается в панели дня. `block` — чужая отлучка в наложении: открывать в
 * ней нечего, это чужие семейные дела.
 */
export type ScheduleItem = {
  readonly id: string;
  readonly entity: 'event' | 'order' | 'block';
  readonly day: DayKey;
  readonly icon: IconName;
  readonly tone: ScheduleTone;
  /** «Звонок», «Монтаж» — что это за работа. */
  readonly kindTitle: string;
  /** Номер наряда. У дела номера нет — это и есть первое отличие в ч/б. */
  readonly number: number | null;
  /** Клиент: к кому едут или кому звонят. */
  readonly title: string;
  /** Адрес объекта — вторая строка, когда место позволяет. */
  readonly note: string | null;
  /**
   * Время начала — «10:00». Конец в подписи не пишется: в сетке он виден
   * высотой записи, а в узкой колонке недели «10:00–13:00» вытесняло бы номер
   * наряда, по которому его зовут вслух. Промежуток целиком идёт в `label`.
   */
  readonly time: string;
  readonly fromMin: number;
  readonly toMin: number;
  /** Выполненное и отменённое гаснет: видно, что осталось на сегодня. */
  readonly muted: boolean;
  /** Налезает на другой наряд того же человека. */
  readonly clash: boolean;
  readonly ownerId: string | null;
  /** Чей это выезд или отлучка — при включённом наложении занятости команды. */
  readonly person: SchedulePersonMark | null;
  /** Подпись для скринридера: цвет и полоса ему ничего не говорят. */
  readonly label: string;
};

/** Колонка сетки: день недели, один день или человек. */
export type ScheduleColumn = {
  readonly key: string;
  readonly day: DayKey;
  readonly title: string;
  /** Подзаголовок: дата у дня недели, загрузка у человека. */
  readonly note: string | null;
  readonly today: boolean;
  readonly selected: boolean;
  /** День вне показываемого месяца — хвост недели на стыке. */
  readonly outside: boolean;
  readonly busy: DayBusy;
  /** Занято минут — ответ на «влезет ли ещё один монтаж» (CRM.md §8.5). */
  readonly loadMin: number;
  readonly clashes: number;
  readonly timed: readonly Placed<ScheduleItem>[];
  /** События без часа выезда — отдельной группой над сеткой. */
  readonly untimed: readonly ScheduleItem[];
  readonly label: string;
};

/**
 * Человек, на которого заводится колонка в виде «по монтажникам».
 *
 * Не `StaffCard` целиком: календарю нужны только номер и подпись, а тянуть в
 * него оформление, телефон и дату найма значило бы делать вид, будто они тут
 * зачем-то нужны.
 */
export type SchedulePerson = {
  readonly id: string;
  readonly name: string | null;
  readonly login: string;
};

/** Данные, из которых собирается любой вид. */
export type ScheduleSource = {
  readonly events: readonly CrmEventCard[];
  readonly orders: readonly CalendarOrderCard[];
  readonly leads: readonly CalendarLead[];
  readonly blocks: readonly DayBlockCard[];
  /** Кто смотрит: своя занятость закрывает ему день, чужая — сообщается. */
  readonly viewerId: string;
  readonly today: DayKey;
  readonly selected: DayKey;
  /**
   * Наложение занятости команды: список людей, чьи выезды и отлучки ложатся на
   * ту же сетку (ADR-123). Пустой список — переключатель выключен, и сетка
   * работает как раньше. Монтажнику он не показывается вовсе: чужая занятость
   * ему не видна (ADR-095).
   */
  readonly team?: readonly SchedulePerson[] | undefined;
};

/** Люди наложения с уже закреплённой краской — считается один раз на вид. */
export function marksOf(team: readonly SchedulePerson[]): ReadonlyMap<string, SchedulePersonMark> {
  return new Map(
    team.map((person) => {
      const title = staffTitle(person);
      return [
        person.id,
        { id: person.id, title, initials: initialsOf(title), tone: personTone(person.id) },
      ];
    }),
  );
}

// ---------- Записи ----------

/**
 * «10:00–13:00». Своя, а не `busyWindowTitle`: та прижимает время к 23:59,
 * потому что окно занятости вводится через `input[type=time]`, а конец наряда
 * приходится ровно на полночь и должен читаться как «00:00».
 */
function timeRange(fromMin: number, toMin: number): string {
  const at = (minutes: number): string =>
    `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

  return `${at(fromMin)}–${at(toMin)}`;
}

/**
 * Наряд → запись сетки.
 *
 * Слово «Наряд» и номер идут в подпись всегда: скринридер обязан отличить
 * выезд от напоминания так же уверенно, как глаз отличает сплошную полосу от
 * пунктирной.
 */
function itemOfOrder(
  order: CalendarOrderCard,
  clash: boolean,
  person: SchedulePersonMark | null,
): ScheduleItem {
  const at = new Date(order.at);
  const day = dayKeyOf(at);
  const span = spanOf(minutesOfDay(at), order.durationMin);
  const look = ORDER_LOOK[order.type];
  const mark = texts.orderMark(order.number);

  return {
    id: order.id,
    entity: 'order',
    day,
    icon: look.icon,
    tone: look.tone,
    kindTitle: look.title,
    number: order.number,
    title: order.clientName,
    note: order.address,
    time: timeOf(at),
    fromMin: span.fromMin,
    toMin: span.toMin,
    muted: order.status === 'done' || order.status === 'cancelled',
    clash,
    ownerId: order.installerId,
    person,
    label: [
      `${mark}, ${look.title.toLocaleLowerCase('ru-RU')}`,
      timeRange(span.fromMin, span.toMin),
      order.clientName,
      order.address,
      order.installerName,
      ORDER_STATUS_TITLE[order.status],
      clash ? crmClashContent.mark : null,
    ]
      .filter((part) => part !== null && part !== '')
      .join(', '),
  };
}

/** Дело → запись сетки. Номера у дела нет: это напоминание, а не работа. */
function itemOfEvent(event: CrmEventCard): ScheduleItem {
  const at = new Date(event.at);
  const fromMin = minutesOfDay(at);
  const span = spanOf(fromMin, EVENT_SLOT_MIN);
  const look = KIND_LOOK[event.kind];

  return {
    id: event.id,
    entity: 'event',
    day: dayKeyOf(at),
    icon: look.icon,
    tone: look.tone,
    kindTitle: look.title,
    number: null,
    title: event.clientName,
    note: event.address,
    time: timeOf(at),
    fromMin: span.fromMin,
    toMin: span.toMin,
    muted: event.status !== 'planned',
    clash: false,
    ownerId: null,
    person: null,
    label: [
      look.title,
      timeOf(at),
      event.clientName,
      event.address,
      event.status === 'planned' ? null : STATUS_TITLE[event.status],
    ]
      .filter((part) => part !== null && part !== '')
      .join(', '),
  };
}

/** Заявка → запись без времени: она пришла, а не была запланирована на час. */
function itemOfLead(lead: CalendarLead): ScheduleItem {
  const at = new Date(lead.at);
  const fromMin = minutesOfDay(at);

  return {
    id: lead.id,
    entity: 'event',
    day: dayKeyOf(at),
    icon: 'chat',
    tone: 'note',
    kindTitle: texts.leadsTitle,
    number: null,
    title: lead.name,
    note: lead.topic,
    time: timeOf(at),
    fromMin,
    toMin: fromMin,
    muted: false,
    clash: false,
    ownerId: null,
    person: null,
    label: [texts.leadsTitle, timeOf(at), lead.name, lead.topic].join(', '),
  };
}

/**
 * Чужая отлучка в наложении занятости команды.
 *
 * Закрытый целиком день не рисуется полосой во всю сетку: он уходит в группу
 * без времени отдельной меткой — иначе колонка дня оказывается закрашена и
 * прочесть в ней что-то ещё невозможно.
 */
function itemsOfBlocks(
  day: DayKey,
  person: SchedulePersonMark,
  blocks: readonly DayBlockCard[],
): readonly ScheduleItem[] {
  return blocksOn(day, blocks).map((block, index) => {
    const whole = block.fromMin === null || block.toMin === null;
    const fromMin = block.fromMin ?? 0;
    const toMin = whole ? fromMin : (block.toMin ?? 0);
    const when = whole ? crmBusyContent.full : busyWindowTitle(fromMin, toMin);

    return {
      /* Повторяемая отлучка ложится на каждую такую неделю, и один номер
         записи встречается в сетке много раз — ключ обязан помнить день. */
      id: `block-${block.id}-${day}-${index}`,
      entity: 'block',
      day,
      icon: whole ? 'danger' : 'clock',
      tone: 'note',
      kindTitle: crmBusyContent.busy,
      number: null,
      title: person.title,
      note: block.reason,
      time: whole ? crmBusyContent.fullShort : timeOfMinutes(fromMin),
      fromMin,
      toMin,
      muted: true,
      clash: false,
      ownerId: person.id,
      person,
      label: [person.title, when, block.reason].filter((part) => part !== null).join(', '),
    } satisfies ScheduleItem;
  });
}

/**
 * Что показывается отдельной группой над сеткой часов.
 *
 * Заявка не назначена на время — она пришла; заметка «не забыть» тоже висит на
 * дне, а не на часе. Оба вида ничего не занимают у человека и не должны
 * растягивать сетку до шести утра из-за времени, которое ничего не значит.
 */
function isUntimed(item: ScheduleItem): boolean {
  if (item.toMin <= item.fromMin) return true;

  // заметка «не забыть» висит на дне, а не на часе; отлучка с окном — на часе
  return item.entity === 'event' && item.tone === 'note';
}

// ---------- Колонки ----------

/** Наряды в виде промежутков — по ним считаются загрузка и пересечения. */
function bookingsOf(orders: readonly CalendarOrderCard[]): readonly Booking[] {
  return orders.map((order) => {
    const span = spanOf(minutesOfDay(new Date(order.at)), order.durationMin);
    return { id: order.id, ownerId: order.installerId, ...span };
  });
}

type ColumnInput = {
  readonly key: string;
  readonly day: DayKey;
  readonly title: string;
  readonly note: string | null;
  readonly outside: boolean;
  readonly busy: DayBusy;
  readonly events: readonly CrmEventCard[];
  readonly orders: readonly CalendarOrderCard[];
  readonly leads: readonly CalendarLead[];
  readonly clashing: ReadonlySet<string>;
  readonly today: DayKey;
  readonly selected: DayKey;
  /** Наложение занятости команды: пустая карта — переключатель выключен. */
  readonly marks: ReadonlyMap<string, SchedulePersonMark>;
  readonly blocks: readonly DayBlockCard[];
};

function columnOf(input: ColumnInput): ScheduleColumn {
  const markOf = (id: string | null): SchedulePersonMark | null =>
    id === null ? null : (input.marks.get(id) ?? null);

  /* Отлучки команды ложатся на ту же сетку, что и выезды: занятость — это
     объединение работы и личных дел, а не два разных ответа (ADR-123). */
  const away = [...input.marks.values()].flatMap((person) =>
    /* 🔴 Занятость личная: человеку показываются только его отлучки. Общий
       список сюда попадает целиком, и без отбора чужой выходной размножился
       бы по всей команде. */
    itemsOfBlocks(
      input.day,
      person,
      input.blocks.filter((block) => block.userId === person.id),
    ),
  );

  const items = [
    ...input.orders.map((order) =>
      itemOfOrder(order, input.clashing.has(order.id), markOf(order.installerId)),
    ),
    ...input.events.map(itemOfEvent),
    ...input.leads.map(itemOfLead),
    ...away,
  ];

  const untimed = items.filter(isUntimed);
  const timed = laneOf(items.filter((item) => !isUntimed(item)));

  /* Загрузка считается по нарядам: у дела длительности нет, и получасовой
     слот, взятый ради рисования, врал бы в цифре занятости. */
  const spans: readonly TimeSpan[] = input.orders.map((order) =>
    spanOf(minutesOfDay(new Date(order.at)), order.durationMin),
  );

  const clashes = input.orders.filter((order) => input.clashing.has(order.id)).length;
  const busyPart = input.busy.state === 'free' ? null : busyTitle(input.busy);

  return {
    key: input.key,
    day: input.day,
    title: input.title,
    note: input.note,
    today: input.day === input.today,
    selected: input.day === input.selected,
    outside: input.outside,
    busy: input.busy,
    loadMin: loadMinutes(spans),
    clashes,
    timed,
    untimed,
    label: [
      input.title,
      input.note,
      busyPart,
      items.length === 0 ? texts.columnEmpty : null,
      clashes === 0 ? null : crmClashContent.count(clashes),
    ]
      .filter((part) => part !== null && part !== '')
      .join(', '),
  };
}

/** Записи, попадающие на этот день. Момент разбирается в поясе работ. */
function onDay<Item extends { readonly at: string }>(
  day: DayKey,
  items: readonly Item[],
): readonly Item[] {
  return items.filter((item) => dayKeyOf(new Date(item.at)) === day);
}

/** Своя занятость: чужая колонку смотрящего не закрывает (ADR-115). */
function ownBusy(day: DayKey, source: ScheduleSource): DayBusy {
  return busyOn(
    day,
    source.blocks.filter((block) => block.userId === source.viewerId),
  );
}

/** Неделя: семь колонок с понедельника. */
export function weekColumns(source: ScheduleSource, day: DayKey): readonly ScheduleColumn[] {
  const clashing = clashingIds(bookingsOf(source.orders));
  const marks = marksOf(source.team ?? []);

  return weekGrid(day).map((cell, index) =>
    columnOf({
      key: cell.key,
      day: cell.key,
      title: `${WEEKDAYS[index] ?? ''} ${cell.day}`,
      note: null,
      outside: !cell.inMonth,
      busy: ownBusy(cell.key, source),
      events: onDay(cell.key, source.events),
      orders: onDay(cell.key, source.orders),
      leads: onDay(cell.key, source.leads),
      clashing,
      today: source.today,
      selected: source.selected,
      marks,
      blocks: source.blocks,
    }),
  );
}

/** День: одна колонка на весь экран. */
export function dayColumns(source: ScheduleSource, day: DayKey): readonly ScheduleColumn[] {
  const clashing = clashingIds(bookingsOf(source.orders));
  const marks = marksOf(source.team ?? []);

  return [
    columnOf({
      key: day,
      day,
      // подпись та же, что у колонки недели: «Чт 27» читается быстрее даты
      title: `${WEEKDAYS[weekdayOf(day) - 1] ?? ''} ${Number.parseInt(day.slice(8), 10)}`,
      note: null,
      outside: false,
      busy: ownBusy(day, source),
      events: onDay(day, source.events),
      orders: onDay(day, source.orders),
      leads: onDay(day, source.leads),
      clashing,
      today: source.today,
      selected: source.selected,
      marks,
      blocks: source.blocks,
    }),
  ];
}

/**
 * Занятость человека за день — объединение отлучек и его же нарядов (ADR-123).
 *
 * Это тот самый ответ на «свободен ли Дмитрий в четверг в десять»: календарь,
 * знающий про врача и не знающий про монтаж, отвечает наполовину. Считает его
 * домен (`busyOn`), здесь только собираются окна нарядов.
 */
export function personBusy(source: ScheduleSource, day: DayKey, personId: string): DayBusy {
  const work = onDay(day, source.orders)
    .filter((order) => order.installerId === personId)
    .map((order) => {
      const span = spanOf(minutesOfDay(new Date(order.at)), order.durationMin);
      return { ...span, reason: `${texts.orderMark(order.number)}, ${order.address}` };
    });

  return busyOn(
    day,
    source.blocks.filter((block) => block.userId === personId),
    work,
  );
}

/**
 * Кто занят в этот день — компактный ответ для клетки месяца (ADR-123).
 *
 * В месяце часов нет и рисовать их в клетке дня незачем: переключатель даёт
 * полоски по людям — «в этот день занят Дмитрий и Сергей», и всё.
 */
export type PersonDayLoad = {
  readonly person: SchedulePersonMark;
  readonly busy: DayBusy;
  readonly loadMin: number;
};

export function teamDayLoad(source: ScheduleSource, day: DayKey): readonly PersonDayLoad[] {
  const marks = marksOf(source.team ?? []);
  const dayOrders = onDay(day, source.orders);

  return [...marks.values()]
    .map((person) => {
      const spans = dayOrders
        .filter((order) => order.installerId === person.id)
        .map((order) => spanOf(minutesOfDay(new Date(order.at)), order.durationMin));

      return { person, busy: personBusy(source, day, person.id), loadMin: loadMinutes(spans) };
    })
    .filter((entry) => entry.busy.state !== 'free');
}

// ---------- Окно часов ----------

export type HourRange = {
  readonly fromMin: number;
  readonly toMin: number;
  readonly hours: readonly number[];
};

/**
 * Какие часы показывает сетка.
 *
 * Рабочее окно 8:00–20:00 расширяется ровно настолько, чтобы вместить всё
 * запланированное: сутки целиком дали бы полтора экрана пустоты, а
 * фиксированное окно молча спрятало бы монтаж, назначенный на семь утра.
 */
export function hourRangeOf(columns: readonly ScheduleColumn[]): HourRange {
  let from = DEFAULT_FROM_MIN;
  let to = DEFAULT_TO_MIN;

  for (const column of columns) {
    for (const placed of column.timed) {
      from = Math.min(from, placed.item.fromMin);
      to = Math.max(to, placed.item.toMin);
    }
  }

  const fromMin = Math.max(Math.floor(from / MINUTES_IN_HOUR) * MINUTES_IN_HOUR, 0);
  const toMin = Math.min(Math.ceil(to / MINUTES_IN_HOUR) * MINUTES_IN_HOUR, MINUTES_IN_DAY);

  const hours = Array.from(
    { length: (toMin - fromMin) / MINUTES_IN_HOUR },
    (_, index) => fromMin / MINUTES_IN_HOUR + index,
  );

  return { fromMin, toMin, hours };
}

/**
 * Доля окна, на которой стоит запись, — в процентах.
 *
 * Считается здесь, а не в разметке: то же число нужно и линии «сейчас», и
 * каждой записи, а расхождение на пиксель в плотной сетке читается как ошибка
 * во времени.
 */
export function offsetPercent(range: HourRange, minutes: number): number {
  const span = range.toMin - range.fromMin;
  if (span <= 0) return 0;

  return ((Math.min(Math.max(minutes, range.fromMin), range.toMin) - range.fromMin) / span) * 100;
}
