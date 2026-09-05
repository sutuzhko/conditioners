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
  overlaps,
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
import { staffShortTitle, staffTitle } from '@/entities/staff/model';
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
  ScheduleKind,
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
  /** Короткое имя для узких мест: «Илья З.» вместо «Захаров Илья». */
  readonly short: string;
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
  /**
   * 🔴 Запись без часа: заявка, заметка «не забыть», закрытый целиком день.
   *
   * Считается раскладкой один раз (`isAllDay`), а не выводится в разметке
   * заново: одна и та же запись попадает и в полосу «весь день», и в клетку
   * месяца, и час у неё не должен появляться ни там, ни там. У заявки в
   * `time` лежит момент обращения — показанный как время встречи, он читается
   * как договорённость, которой не было (BUGS, аудит 30 августа).
   */
  readonly allDay: boolean;
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

/**
 * Запись до того, как раскладка решила, есть ли у неё час.
 *
 * Признак `allDay` считается один раз в колонке (`isAllDay`), а не в каждом
 * сборщике: правило одно на все четыре сущности, и разъехаться ему нельзя.
 */
type ItemDraft = Omit<ScheduleItem, 'allDay'>;

/**
 * Свёрнутая кучка: сколько записей не поместилось и на каком отрезке.
 *
 * 🔴 Ширину колонки делят не бесконечно (issue #47, вердикт владельца). В
 * неделе на 1440 колонка выходит около 120px, и голова чипа — полоса, значок
 * и час — съедает шестьдесят: на имя остаётся семь знаков, а на двух записях
 * рядом не остаётся ничего, и от «Фёдоров» видно «Фе…». Эталон (Apple
 * Calendar) в такой тесноте не ужимает, а прячет остаток за «+N».
 */
export type MoreMark = {
  readonly key: string;
  readonly day: DayKey;
  /** Отрезок кучки: метка стоит у её начала, а не растягивается на всю. */
  readonly fromMin: number;
  readonly toMin: number;
  readonly count: number;
  /**
   * 🔴 Сами свёрнутые записи, а не только их число. Свёртка — это про ширину
   * колонки, и списку она не касается: повестка на телефоне и клетка месяца
   * читают всё через `monthRows`, и потерять там запись значило бы, что выезд
   * пропал из календаря, а не «спрятался за меткой».
   */
  readonly items: readonly ScheduleItem[];
  /** Подпись для скринридера: «Ещё 2 записи в 09:00–13:00, открыть день». */
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
  /** Кучки, не поместившиеся по ширине: остаток свёрнут в «+N». */
  readonly more: readonly MoreMark[];
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

/**
 * Что показывает слой занятости — issue #49, запрос владельца 27 августа.
 *
 * 🔴 Слой, включаемый целиком, на пяти монтажниках даёт ту же кашу, ради
 * которой он и затевался. Поэтому у него два ограничителя: кого видно и надо
 * ли вообще всё остальное. Оба живут в адресе (инвариант 17) и приезжают сюда
 * разобранными: раскладка не знает про `URLSearchParams`.
 */
export type ScheduleFilter = {
  /** Кого видно в слое. `null` — всех, кто в него попал. */
  readonly who: ReadonlySet<string> | null;
  /**
   * Какие виды записей показывать. `null` — все три.
   *
   * Разбивка взята с макета («Виды записей»: наряды · заявки без времени ·
   * дела и отлучки). Вопрос «кто свободен в четверг в десять» решается
   * снятием двух галочек, а не вычитанием лишнего глазами.
   */
  readonly kinds: ReadonlySet<ScheduleKind> | null;
};

/** Ничего не спрятано — состояние по умолчанию и при выключенном слое. */
export const ALL_VISIBLE: ScheduleFilter = { who: null, kinds: null };

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
  /**
   * Ограничители слоя занятости (issue #49). Без него показывается всё —
   * это же состояние остаётся при выключенном слое.
   */
  readonly filter?: ScheduleFilter | undefined;
};

/** Люди наложения с уже закреплённой краской — считается один раз на вид. */
export function marksOf(team: readonly SchedulePerson[]): ReadonlyMap<string, SchedulePersonMark> {
  return new Map(
    team.map((person) => {
      /* Полное имя нужно озвучке и подсказке, короткое — узким местам:
         карточка «Показывать» и плашка «весь день» шире имени не бывают, и
         «Миронов Арт…» там не читается (макет пишет «Пётр К.»). */
      const title = staffTitle(person);
      return [
        person.id,
        {
          id: person.id,
          title,
          short: staffShortTitle(person),
          initials: initialsOf(title),
          tone: personTone(person.id),
        },
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
): ItemDraft {
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
function itemOfEvent(event: CrmEventCard): ItemDraft {
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
function itemOfLead(lead: CalendarLead): ItemDraft {
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
): readonly ItemDraft[] {
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
    } satisfies ItemDraft;
  });
}

/**
 * Что уходит в полосу «весь день».
 *
 * Заявка не назначена на время — она пришла; заметка «не забыть» висит на дне,
 * а не на часе; закрытый целиком день — это сутки, а не промежуток. Всё
 * остальное имеет начало и конец и рисуется по ним.
 */
function isAllDay(item: ItemDraft): boolean {
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
  /**
   * Сколько записей делят ширину колонки, прежде чем остаток свернётся в «+N».
   * Число даёт вид: у недели колонка узкая, у дня — во весь экран.
   */
  readonly laneLimit: number;
};

/**
 * Кучки записей: группа, связанная пересечениями напрямую или через соседа.
 *
 * Считается здесь, а не в `entities/crm/lib/load`: там `laneOf` раздаёт
 * дорожки и про свёртку не знает, а знать ей и незачем — свёртка это про
 * ширину экрана, а не про время.
 */
function clustersOf<Item extends { readonly fromMin: number; readonly toMin: number }>(
  items: readonly Item[],
): readonly (readonly Item[])[] {
  const sorted = [...items].sort(
    (left, right) => left.fromMin - right.fromMin || left.toMin - right.toMin,
  );

  const clusters: Item[][] = [];
  let current: Item[] = [];
  let edge = -1;

  for (const item of sorted) {
    if (current.length > 0 && item.fromMin >= edge) {
      clusters.push(current);
      current = [];
    }

    current.push(item);
    edge = Math.max(edge, item.toMin);
  }

  if (current.length > 0) clusters.push(current);
  return clusters;
}

/**
 * Кто уступает место: записи, которым не хватило дорожки под пределом.
 *
 * 🔴 Дорожки раздаются в другом порядке, чем в `laneOf`: при равном начале
 * место оставляет себе более длинная запись. Иначе получасовой звонок в 10:00
 * прячет за «+1» трёхчасовой монтаж, начатый в тот же час, — а неделю
 * открывают ради монтажей. Это правило показа, а не домена, и живёт оно здесь,
 * а не в `entities/crm/lib/load`: там считают время, тут — что видно на экране.
 */
function crowdedOut(items: readonly ScheduleItem[], limit: number): readonly ScheduleItem[] {
  const sorted = [...items].sort(
    (left, right) =>
      left.fromMin - right.fromMin ||
      right.toMin - right.fromMin - (left.toMin - left.fromMin) ||
      left.id.localeCompare(right.id),
  );

  const open: { readonly item: ScheduleItem; readonly lane: number }[] = [];
  const hidden: ScheduleItem[] = [];

  for (const item of sorted) {
    const taken = new Set(
      open.filter((entry) => overlaps(entry.item, item)).map((entry) => entry.lane),
    );

    let lane = 0;
    while (taken.has(lane)) lane += 1;

    open.push({ item, lane });
    if (lane >= limit) hidden.push(item);
  }

  return hidden;
}

/**
 * Раскладка колонки со свёрткой: что показать рядом, а что спрятать за «+N».
 *
 * 🔴 Прячется по дорожкам, а не по кучкам целиком. Пять записей за день, из
 * которых одновременно идут только две, — это не повод сворачивать четыре:
 * дорожку выше предела получает ровно та запись, которой не хватило места на
 * своём часе. Оставшиеся раскладываются заново — иначе одна видимая запись
 * держала бы треть ширины, отведённую спрятанным соседям.
 */
function foldLanes(
  day: DayKey,
  items: readonly ScheduleItem[],
  limit: number,
): { readonly timed: readonly Placed<ScheduleItem>[]; readonly more: readonly MoreMark[] } {
  const hidden = crowdedOut(items, limit);
  if (hidden.length === 0) return { timed: laneOf(items), more: [] };

  const dropped = new Set(hidden.map((item) => item.id));
  const shown = items.filter((item) => !dropped.has(item.id));

  const more = clustersOf(hidden).map((cluster) => {
    const fromMin = Math.min(...cluster.map((item) => item.fromMin));
    const toMin = Math.max(...cluster.map((item) => item.toMin));

    return {
      key: `more-${day}-${fromMin}-${toMin}`,
      day,
      fromMin,
      toMin,
      count: cluster.length,
      items: cluster,
      label: texts.moreAt(cluster.length, timeRange(fromMin, toMin)),
    } satisfies MoreMark;
  });

  return { timed: laneOf(shown), more };
}

/** Записи, попадающие на этот день. Момент разбирается в поясе работ. */
function onDay<Item extends { readonly at: string }>(
  day: DayKey,
  items: readonly Item[],
): readonly Item[] {
  return items.filter((item) => dayKeyOf(new Date(item.at)) === day);
}

function columnOf(input: ColumnInput): ScheduleColumn {
  const { day, source, marks } = input;
  const filter = source.filter ?? ALL_VISIBLE;

  const markOf = (id: string | null): SchedulePersonMark | null =>
    id === null ? null : (marks.get(id) ?? null);

  /* 🔴 Фильтр по людям решает, чьи записи видны, а не чьи покрашены (issue
     #49). Краска остаётся закреплённой за человеком (ADR-123): выключенный
     монтажник исчезает с сетки и возвращается тем же цветом. */
  const shown = (id: string): boolean => filter.who === null || filter.who.has(id);

  /* Вид записи снимается галочкой «Виды записей» на карточке слева. */
  const kindShown = (kind: ScheduleKind): boolean =>
    filter.kinds === null || filter.kinds.has(kind);

  /* Наряд без исполнителя ничей: фильтр по людям его не касается — снять его
     с сетки можно только галочкой «Наряды». */
  const orders = kindShown('orders')
    ? onDay(day, source.orders).filter((order) =>
        order.installerId === null ? true : shown(order.installerId),
      )
    : [];
  const events = kindShown('notes') ? onDay(day, source.events) : [];
  const leads = kindShown('leads') ? onDay(day, source.leads) : [];

  /* Своя отлучка показывается всегда: без неё пустая колонка выглядит
     свободной, и в неё ставят выезд (ADR-115). Чужие приходят слоем. */
  const mineBlocks = kindShown('notes')
    ? source.blocks.filter((block) => block.userId === source.viewerId)
    : [];
  const own = itemsOfBlocks(day, null, texts.busyMine, mineBlocks, true);

  /* Отлучки команды ложатся на ту же сетку, что и выезды: занятость — это
     объединение работы и личных дел, а не два разных ответа (ADR-123). */
  const away = (kindShown('notes') ? [...marks.values()] : [])
    .filter((person) => person.id !== source.viewerId && shown(person.id))
    .flatMap((person) =>
      itemsOfBlocks(
        day,
        person,
        person.title,
        source.blocks.filter((block) => block.userId === person.id),
        false,
      ),
    );

  const drafts = [
    ...orders.map((order) =>
      itemOfOrder(order, input.clashing.has(order.id), markOf(order.installerId)),
    ),
    ...events.map(itemOfEvent),
    ...leads.map(itemOfLead),
    ...own,
    ...away,
  ];

  /* Признак «весь день» ставится здесь и один раз: дальше по нему решают и
     полоса над сеткой, и клетка месяца, и сама запись — показывать ли час. */
  const items: readonly ScheduleItem[] = drafts.map((item) => ({
    ...item,
    allDay: isAllDay(item),
  }));

  const allDay = items
    .filter((item) => item.allDay)
    .sort((left, right) => left.fromMin - right.fromMin);
  const { timed, more } = foldLanes(
    day,
    items.filter((item) => !item.allDay),
    input.laneLimit,
  );

  /* Загрузка считается по нарядам: дело — это напоминание, и час, отведённый
     на звонок, не занимает бригаду. */
  const spans: readonly TimeSpan[] = orders.map((order) =>
    spanOf(minutesOfDay(new Date(order.at)), order.durationMin),
  );

  const clashes = orders.filter((order) => input.clashing.has(order.id)).length;

  /* Занятость шапки считается по тем же отлучкам, что показаны в колонке:
     иначе «Занят» стоит над днём, в котором отлучку только что спрятали. */
  const busy = busyOn(day, mineBlocks);

  /* Что требует внимания: пересечение по времени и переработка. Это ответ на
     вопрос «куда смотреть с утра», и он обязан звучать словами — клетка
     месяца на телефоне показывает точки, а точка ничего не говорит
     скринридеру (issue #547, решение владельца). */
  const attention = items.filter((item) => item.clash || item.overtimeMin > 0).length;

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
    more,
    allDay,
    label: [
      dayTitle(day),
      items.length === 0 ? texts.columnEmpty : texts.records(items.length),
      attention === 0 ? null : texts.attention(attention),
      busy.state === 'free' ? null : busyTitle(busy),
    ]
      .filter((part) => part !== null && part !== '')
      .join(', '),
  };
}

/**
 * 🔴 Сколько записей делят ширину колонки недели — одна (issue #47).
 *
 * Считано по чипу, а не выбрано на глаз. В неделе на 1440 колонка выходит
 * около 120px: 3px полоса вида, 10px поля, 12px значок, 4px просвет и час
 * «09:00» кеглем 12 — это ещё 34px. На имя остаётся под шестьдесят, то есть
 * семь знаков с многоточием. Разделив колонку надвое, мы отдаём имени
 * тридцать — не остаётся ничего, и владелец видит «Фе…» вместо «Фёдоров».
 * Остаток уходит за «+N», как в эталоне.
 */
const WEEK_LANES = 1;

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
      laneLimit: WEEK_LANES,
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
      /* В дне колонка занимает весь экран, и три записи рядом читаются:
         сворачивать там нечего, а уходить из дня уже некуда. */
      laneLimit: LANES_ABREAST,
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
        /* Месяц раскладывает клетку строками, а не дорожками: свернуть там
           нечего — переполнение и так уходит в «Ещё N» и в точки. */
        laneLimit: Number.POSITIVE_INFINITY,
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
  /* Свёрнутое за «+N» возвращается в список: метка экономит ширину колонки, а
     в списке ширина не при чём — там пропавшая запись читается как потерянная. */
  const timed = [
    ...column.timed.map((placed) => placed.item),
    ...column.more.flatMap((mark) => mark.items),
  ].sort((left, right) => left.fromMin - right.fromMin || left.toMin - right.toMin);

  return [...column.allDay, ...timed];
}

/**
 * Сколько часов у каждого человека в показанном промежутке — цифра рядом с
 * именем на карточке «Показывать» (макет `design/admin/Calendar.body.html`).
 *
 * 🔴 Считается по нарядам и из исходных данных, а не из колонок: цифра рядом
 * с выключенным человеком обязана остаться прежней, иначе снятая галочка
 * «обнуляет» его загрузку и по ней перестаёт быть видно, кого можно догрузить.
 *
 * Пересечения не считаются дважды — за это отвечает `loadMinutes`, и считать
 * приходится по дням: два наряда 10–12 в разные дни это четыре часа, а в один
 * и тот же — два.
 */
export function teamLoad(
  orders: readonly CalendarOrderCard[],
  team: readonly SchedulePerson[],
): ReadonlyMap<string, number> {
  const byPerson = new Map<string, Map<DayKey, TimeSpan[]>>();

  for (const order of orders) {
    if (order.installerId === null) continue;

    const at = new Date(order.at);
    const day = dayKeyOf(at);
    const days = byPerson.get(order.installerId) ?? new Map<DayKey, TimeSpan[]>();
    const spans = days.get(day) ?? [];

    spans.push(spanOf(minutesOfDay(at), order.durationMin));
    days.set(day, spans);
    byPerson.set(order.installerId, days);
  }

  return new Map(
    team.map((person) => {
      const days = byPerson.get(person.id);
      const minutes =
        days === undefined
          ? 0
          : [...days.values()].reduce((total, spans) => total + loadMinutes(spans), 0);

      return [person.id, minutes];
    }),
  );
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
