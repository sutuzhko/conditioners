/**
 * Раскладка календаря: что показывать в сетке, где это стоит по времени и что
 * с чем спорит.
 *
 * 🔴 Модель — календарь Apple (ADR-128, CRM §3.5.1): позиция и высота записи
 * задаются строго её временем, записи без времени уходят в отдельную полосу
 * «весь день», а пересечения делят ширину колонки. Всё это — арифметика, и
 * считается она здесь, а не в разметке: сетка часов плотная, проверять её
 * глазами на каждой правке нельзя.
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
import type { WorkWindow } from '@/entities/crm/lib/overtime';
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
  loadTitle,
} from '@/entities/crm/content';
import { staffTitle } from '@/entities/staff/model';
import {
  type DayKey,
  dayKeyOf,
  minutesOfDay,
  monthGrid,
  timeOf,
  weekGrid,
  weekdayOf,
} from '@/shared/lib/calendar';
import type { IconName } from '@/shared/ui';

import {
  KIND_LOOK,
  LEADS_PATH,
  ORDERS_PATH,
  ORDER_LOOK,
  ORDER_STATUS_TITLE,
  STATUS_TITLE,
  WEEKDAYS,
  crmContent as texts,
  dayTitle,
} from './content';
import type {
  CalendarLead,
  CalendarOrderCard,
  CrmEventCard,
  CrmEventDraft,
  DayBlockCard,
  DayBlockDraft,
} from './model';

const MINUTES_IN_HOUR = 60;
const MINUTES_IN_DAY = 24 * 60;

/** Часов в сутках: сетка рисует их все, рабочее окно только подсказывает, куда смотреть. */
export const HOURS_IN_DAY = 24;

/**
 * Рабочее окно по умолчанию — 9:00–19:00.
 *
 * Совпадает с умолчанием настройки `schedule` (ADR-138). Нужно там, где окно
 * не передали: истории Storybook и тесты не ходят в базу, а сетка без окна
 * молча показывала бы переработкой весь день.
 */
export const DEFAULT_WORK_WINDOW: WorkWindow = { fromMin: 9 * 60, toMin: 19 * 60 };

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
 * Что открывает карточка записи по кнопке «Изменить».
 *
 * Дискриминированное объединение, а не два необязательных поля: дело и
 * занятость правятся разными формами, и «оба пусты» или «оба заполнены» —
 * состояния, которых быть не должно.
 */
export type ScheduleEdit =
  | { readonly kind: 'event'; readonly id: string; readonly draft: CrmEventDraft }
  | { readonly kind: 'block'; readonly id: string; readonly draft: DayBlockDraft };

/**
 * Запись в сетке.
 *
 * 🔴 Наряд, дело и заявка — разные сущности с разным смыслом (ADR-093), и
 * `entity` их разводит: наряд правится в своём разделе, заявка — в своём,
 * дело — прямо здесь. `block` — отлучка: своя правится, чужая только видна.
 *
 * Плоская структура из строк и чисел выбрана намеренно: запись переезжает из
 * серверного компонента в клиентский лист пропсом, а функции и классы границу
 * не переживают.
 */
export type ScheduleItem = {
  readonly id: string;
  readonly entity: 'event' | 'order' | 'lead' | 'block';
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
  /** Телефон для звонка прямо из карточки записи. */
  readonly phone: string | null;
  /** Заметка целиком — она читается в карточке, а не в полоске сетки. */
  readonly detail: string | null;
  /** Статус словами: «Сделано», «В работе». У запланированного — пусто. */
  readonly statusTitle: string | null;
  /** Время начала — «10:00». Промежуток целиком лежит в `range`. */
  readonly time: string;
  /** «10:00–13:00» — то, что читается в карточке и в подписи. */
  readonly range: string;
  readonly fromMin: number;
  readonly toMin: number;
  /** 🔴 Минуты за рабочим окном на момент записи. Считает сервер (ADR-138). */
  readonly overtimeMin: number;
  /** Выполненное и отменённое гаснет: видно, что осталось на сегодня. */
  readonly muted: boolean;
  /** Налезает на другой наряд того же человека. */
  readonly clash: boolean;
  readonly ownerId: string | null;
  /** Чей это выезд или отлучка — при включённом наложении занятости команды. */
  readonly person: SchedulePersonMark | null;
  /** Куда ведёт «Открыть»: наряд — в свою карточку, заявка — в свой раздел. */
  readonly href: string | null;
  /** Подпись кнопки перехода: «Открыть наряд», «Открыть в заявках». */
  readonly hrefTitle: string | null;
  /** Чем правится запись. `null` — чужое: наряд, заявка, отлучка соседа. */
  readonly edit: ScheduleEdit | null;
  /** Подпись для скринридера: цвет и полоса ему ничего не говорят. */
  readonly label: string;
};

/** Колонка сетки: один день. */
export type ScheduleColumn = {
  readonly key: string;
  readonly day: DayKey;
  /** «Чт» — день недели в шапке колонки. */
  readonly weekday: string;
  /** Число месяца — крупная цифра шапки, она же подпись клетки месяца. */
  readonly date: number;
  readonly today: boolean;
  /** День вне показываемого месяца — хвост недели или месячной сетки. */
  readonly outside: boolean;
  readonly busy: DayBusy;
  /** Занято минут — ответ на «влезет ли ещё один монтаж» (CRM.md §8.5). */
  readonly loadMin: number;
  readonly clashes: number;
  readonly timed: readonly Placed<ScheduleItem>[];
  /** 🔴 Полоса «весь день»: записи без часа и заявки с сайта (ADR-128). */
  readonly allDay: readonly ScheduleItem[];
  readonly label: string;
};

/**
 * Человек, на которого ложится слой занятости.
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
  /** Кто смотрит: своя занятость правится, чужая только видна. */
  readonly viewerId: string;
  readonly today: DayKey;
  /**
   * Наложение занятости команды: список людей, чьи выезды и отлучки ложатся на
   * ту же сетку (ADR-123). Пустой список — переключатель выключен. Монтажнику
   * он не показывается вовсе: чужая занятость ему не видна (ADR-095).
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

/** Слова про переработку — одинаковые в подписи и в карточке (ADR-138). */
function overtimePart(overtimeMin: number): string | null {
  return overtimeMin <= 0 ? null : texts.overtimeOf(loadTitle(overtimeMin));
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
  const range = timeRange(span.fromMin, span.toMin);

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
    phone: null,
    detail: order.installerName,
    statusTitle: ORDER_STATUS_TITLE[order.status],
    time: timeOf(at),
    range,
    fromMin: span.fromMin,
    toMin: span.toMin,
    overtimeMin: 0,
    muted: order.status === 'done' || order.status === 'cancelled',
    clash,
    ownerId: order.installerId,
    person,
    href: `${ORDERS_PATH}/${order.id}`,
    hrefTitle: texts.orderOpen,
    /* 🔴 Наряд правится в своём разделе (ADR-093): деньги, исполнитель и
       удержание живут там, и вторая точка правки разошлась бы с первой. */
    edit: null,
    label: [
      `${mark}, ${look.title.toLocaleLowerCase('ru-RU')}`,
      range,
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
  const day = dayKeyOf(at);
  const time = timeOf(at);
  const span = spanOf(minutesOfDay(at), event.durationMin);
  const look = KIND_LOOK[event.kind];
  const range = timeRange(span.fromMin, span.toMin);

  return {
    id: event.id,
    entity: 'event',
    day,
    icon: look.icon,
    tone: look.tone,
    kindTitle: look.title,
    number: null,
    title: event.clientName,
    note: event.address,
    phone: event.clientPhone,
    detail: event.note,
    statusTitle: event.status === 'planned' ? null : STATUS_TITLE[event.status],
    time,
    range,
    fromMin: span.fromMin,
    toMin: span.toMin,
    overtimeMin: event.overtimeMin,
    muted: event.status !== 'planned',
    clash: false,
    ownerId: null,
    person: null,
    href: null,
    hrefTitle: null,
    edit: {
      kind: 'event',
      id: event.id,
      draft: {
        kind: event.kind,
        day,
        time,
        durationMin: event.durationMin,
        clientName: event.clientName,
        clientPhone: event.clientPhone ?? '',
        address: event.address ?? '',
        note: event.note ?? '',
        leadId: event.leadId,
      },
    },
    label: [
      look.title,
      range,
      event.clientName,
      event.address,
      event.status === 'planned' ? null : STATUS_TITLE[event.status],
      overtimePart(event.overtimeMin),
    ]
      .filter((part) => part !== null && part !== '')
      .join(', '),
  };
}

/**
 * Заявка → запись полосы «весь день».
 *
 * 🔴 Она пришла, а не была назначена на час (ADR-128), и живёт в полосе, пока
 * ей не поставили время делом или нарядом. Час обращения показан текстом: он
 * говорит, когда человек написал, но не занимает места в сетке.
 */
function itemOfLead(lead: CalendarLead): ScheduleItem {
  const at = new Date(lead.at);
  const fromMin = minutesOfDay(at);
  const time = timeOf(at);

  return {
    id: `lead-${lead.id}`,
    entity: 'lead',
    day: dayKeyOf(at),
    icon: 'chat',
    tone: 'note',
    kindTitle: texts.leadsTitle,
    number: null,
    title: lead.name,
    note: lead.topic,
    phone: lead.phone,
    detail: null,
    statusTitle: null,
    time,
    range: time,
    fromMin,
    toMin: fromMin,
    overtimeMin: 0,
    muted: false,
    clash: false,
    ownerId: null,
    person: null,
    href: LEADS_PATH,
    hrefTitle: texts.leadLink,
    edit: null,
    label: [texts.leadsTitle, time, lead.name, lead.topic].join(', '),
  };
}

/**
 * Отлучка → запись сетки.
 *
 * Закрытый целиком день уходит в полосу «весь день»: закрашенная сверху донизу
 * колонка не даёт прочесть в ней ничего другого. Отлучка на часы остаётся на
 * своём месте в сетке — «занят с 11 до 20» обязано быть закрашено ровно с 11
 * до 20 (BUGS, вердикт владельца).
 */
function itemsOfBlocks(
  day: DayKey,
  person: SchedulePersonMark | null,
  who: string,
  blocks: readonly DayBlockCard[],
  mine: boolean,
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
      title: who,
      note: block.reason,
      phone: null,
      detail: block.repeat === 'weekly' ? texts.busyRepeatNote : null,
      statusTitle: null,
      time: whole ? crmBusyContent.fullShort : timeOfMinutes(fromMin),
      range: when,
      fromMin,
      toMin,
      overtimeMin: 0,
      muted: true,
      clash: false,
      ownerId: person?.id ?? null,
      person,
      href: null,
      hrefTitle: null,
      /* 🔴 Занятость личная: снять и поправить её может только хозяин —
         чужой выходной не решение владельца (ADR-115). */
      edit: mine
        ? {
            kind: 'block',
            id: block.id,
            draft: {
              repeat: block.repeat,
              day: block.day ?? day,
              weekday: block.weekday ?? weekdayOf(day),
              allDay: whole,
              from: timeOfMinutes(fromMin),
              to: timeOfMinutes(whole ? fromMin + MINUTES_IN_HOUR : toMin),
              reason: block.reason ?? '',
            },
          }
        : null,
      label: [who, when, block.reason].filter((part) => part !== null && part !== '').join(', '),
    } satisfies ScheduleItem;
  });
}

/**
 * Что уходит в полосу «весь день».
 *
 * Заявка не назначена на время — она пришла; заметка «не забыть» висит на дне,
 * а не на часе; закрытый целиком день — это сутки, а не промежуток. Всё
 * остальное имеет начало и конец и рисуется по ним.
 */
function isAllDay(item: ScheduleItem): boolean {
  if (item.entity === 'lead') return true;
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
  readonly day: DayKey;
  readonly date: number;
  readonly outside: boolean;
  readonly source: ScheduleSource;
  readonly clashing: ReadonlySet<string>;
  /** Наложение занятости команды: пустая карта — переключатель выключен. */
  readonly marks: ReadonlyMap<string, SchedulePersonMark>;
};

/** Записи, попадающие на этот день. Момент разбирается в поясе работ. */
function onDay<Item extends { readonly at: string }>(
  day: DayKey,
  items: readonly Item[],
): readonly Item[] {
  return items.filter((item) => dayKeyOf(new Date(item.at)) === day);
}

function columnOf(input: ColumnInput): ScheduleColumn {
  const { day, source, marks } = input;

  const markOf = (id: string | null): SchedulePersonMark | null =>
    id === null ? null : (marks.get(id) ?? null);

  const orders = onDay(day, source.orders);
  const events = onDay(day, source.events);
  const leads = onDay(day, source.leads);

  /* Своя отлучка показывается всегда: без неё пустая колонка выглядит
     свободной, и в неё ставят выезд (ADR-115). Чужие приходят слоем. */
  const own = itemsOfBlocks(
    day,
    null,
    texts.busyMine,
    source.blocks.filter((block) => block.userId === source.viewerId),
    true,
  );

  /* Отлучки команды ложатся на ту же сетку, что и выезды: занятость — это
     объединение работы и личных дел, а не два разных ответа (ADR-123). */
  const away = [...marks.values()]
    .filter((person) => person.id !== source.viewerId)
    .flatMap((person) =>
      itemsOfBlocks(
        day,
        person,
        person.title,
        source.blocks.filter((block) => block.userId === person.id),
        false,
      ),
    );

  const items = [
    ...orders.map((order) =>
      itemOfOrder(order, input.clashing.has(order.id), markOf(order.installerId)),
    ),
    ...events.map(itemOfEvent),
    ...leads.map(itemOfLead),
    ...own,
    ...away,
  ];

  const allDay = items.filter(isAllDay).sort((left, right) => left.fromMin - right.fromMin);
  const timed = laneOf(items.filter((item) => !isAllDay(item)));

  /* Загрузка считается по нарядам: дело — это напоминание, и час, отведённый
     на звонок, не занимает бригаду. */
  const spans: readonly TimeSpan[] = orders.map((order) =>
    spanOf(minutesOfDay(new Date(order.at)), order.durationMin),
  );

  const clashes = orders.filter((order) => input.clashing.has(order.id)).length;
  const busy = busyOn(
    day,
    source.blocks.filter((block) => block.userId === source.viewerId),
  );

  return {
    key: day,
    day,
    weekday: WEEKDAYS[weekdayOf(day) - 1] ?? '',
    date: input.date,
    today: day === source.today,
    outside: input.outside,
    busy,
    loadMin: loadMinutes(spans),
    clashes,
    timed,
    allDay,
    label: [
      dayTitle(day),
      busy.state === 'free' ? null : busyTitle(busy),
      items.length === 0 ? texts.columnEmpty : null,
      clashes === 0 ? null : crmClashContent.count(clashes),
    ]
      .filter((part) => part !== null && part !== '')
      .join(', '),
  };
}

/** Неделя: семь колонок с понедельника. */
export function weekColumns(source: ScheduleSource, day: DayKey): readonly ScheduleColumn[] {
  const clashing = clashingIds(bookingsOf(source.orders));
  const marks = marksOf(source.team ?? []);

  return weekGrid(day).map((cell) =>
    columnOf({
      day: cell.key,
      date: cell.day,
      outside: !cell.inMonth,
      source,
      clashing,
      marks,
    }),
  );
}

/** День: одна колонка на весь экран. */
export function dayColumns(source: ScheduleSource, day: DayKey): readonly ScheduleColumn[] {
  const clashing = clashingIds(bookingsOf(source.orders));
  const marks = marksOf(source.team ?? []);

  return [
    columnOf({
      day,
      date: Number.parseInt(day.slice(8), 10),
      outside: false,
      source,
      clashing,
      marks,
    }),
  ];
}

/**
 * Месяц: сорок две клетки той же выделки, что и колонки недели.
 *
 * Клетка месяца — тот же день, только показан списком строк вместо часовой
 * сетки (ADR-128). Считать его вторым способом значило бы завести второй
 * ответ на вопрос «что в этот день»: они разошлись бы на первой же правке.
 */
export function monthColumns(source: ScheduleSource, month: string): readonly ScheduleColumn[] {
  const clashing = clashingIds(bookingsOf(source.orders));
  const marks = marksOf(source.team ?? []);

  return monthGrid(month)
    .flat()
    .map((cell) =>
      columnOf({
        day: cell.key,
        date: cell.day,
        outside: !cell.inMonth,
        source,
        clashing,
        marks,
      }),
    );
}

/**
 * Строки клетки месяца: сначала «весь день», дальше по времени.
 *
 * 🔴 Время показывается всегда (ADR-128): капсулы с инициалами, из которых не
 * следует, когда человек занят, владелец забраковал прямо.
 */
export function monthRows(column: ScheduleColumn): readonly ScheduleItem[] {
  return [...column.allDay, ...[...column.timed].map((placed) => placed.item)];
}

// ---------- Окно часов ----------

export type HourRange = {
  /** Часы, которые рисует сетка: сутки целиком, ночь доступна прокруткой. */
  readonly hours: readonly number[];
  /** Рабочее окно: к нему сетка прокручена при открытии (ADR-128). */
  readonly workFromMin: number;
  readonly workToMin: number;
};

/**
 * Какие часы показывает сетка.
 *
 * 🔴 Сутки целиком, а не подобранное под записи окно. Подбор давал сетку, у
 * которой час стоит то там, то тут: тот же четверг после сдвига одного наряда
 * выглядел иначе, и глаз переставал доверять положению записи. Рабочее окно
 * (настройка `schedule`, ADR-138) решает только то, куда сетка прокручена и
 * какие часы помечены нерабочими; ночь никуда не девается.
 */
export function hourRangeOf(window: WorkWindow = DEFAULT_WORK_WINDOW): HourRange {
  const workFromMin = Math.min(Math.max(window.fromMin, 0), MINUTES_IN_DAY);
  const workToMin = Math.min(Math.max(window.toMin, workFromMin), MINUTES_IN_DAY);

  return {
    hours: Array.from({ length: HOURS_IN_DAY }, (_, index) => index),
    workFromMin,
    workToMin,
  };
}

/** Час целиком лежит за рабочим окном — его фон помечает переработку. */
export function isOffHour(range: HourRange, hour: number): boolean {
  const from = hour * MINUTES_IN_HOUR;
  return from + MINUTES_IN_HOUR <= range.workFromMin || from >= range.workToMin;
}

/**
 * Доля суток, на которой стоит запись, — в процентах.
 *
 * Проценты, а не пиксели: высота часа задаётся в CSS одной переменной, и
 * позиция записи обязана следовать за ней, не зная её значения. Расхождение
 * числа в разметке и числа в модуле читалось бы как ошибка во времени.
 */
export function offsetPercent(minutes: number): number {
  return (Math.min(Math.max(minutes, 0), MINUTES_IN_DAY) / MINUTES_IN_DAY) * 100;
}

/**
 * Место записи по горизонтали внутри колонки.
 *
 * До трёх пересекающихся записей делят ширину поровну — так обе читаются
 * целиком. Дальше делить нечего: четвёртая колонка шириной в палец не
 * вмещает даже времени, поэтому записи встают лесенкой с наложением, как в
 * эталоне (CRM §3.5.1). Верхняя перекрывает нижние, и её видно целиком.
 */
export const LANES_ABREAST = 3;

export type LanePlace = {
  readonly leftPercent: number;
  readonly widthPercent: number;
  /** Порядок наложения: в лесенке поздняя запись лежит поверх ранних. */
  readonly depth: number;
};

export function lanePlace(lane: number, lanes: number): LanePlace {
  if (lanes <= LANES_ABREAST) {
    const width = 100 / lanes;
    return { leftPercent: lane * width, widthPercent: width, depth: lane };
  }

  /* Шаг лесенки: последняя запись начинается на 70% ширины колонки — того,
     что осталось, хватает на время и первое слово названия. */
  const step = 70 / (lanes - 1);
  const left = lane * step;
  return { leftPercent: left, widthPercent: 100 - left, depth: lane };
}
