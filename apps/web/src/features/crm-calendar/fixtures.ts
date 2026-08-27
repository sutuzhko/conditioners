/** Данные для историй и тестов календаря работ. */
import { personTone } from '@/entities/crm/lib/palette';
import type { StaffCard } from '@/entities/staff/model';

import type { TeamDayMark } from './CalendarGrid';
import type { CalendarLead, CalendarOrderCard, CrmEventCard, DayBlockCard } from './model';

/** 23 августа 2026, 10:00 по московскому времени. */
export const plannedCall: CrmEventCard = {
  id: 'e1',
  kind: 'call',
  status: 'planned',
  at: '2026-08-23T07:00:00.000Z',
  clientName: 'Ирина',
  clientPhone: '+7 (900) 123-45-67',
  address: null,
  note: 'Перезвонить после обеда, уточнить этаж',
  leadId: null,
};

/** Монтаж в тот же день: у дня бывает больше одного дела. */
export const plannedInstall: CrmEventCard = {
  id: 'e2',
  kind: 'install',
  status: 'planned',
  at: '2026-08-23T10:30:00.000Z',
  clientName: 'Сергей',
  clientPhone: '+7 (910) 765-43-21',
  address: 'Тула, Пролетарская 12, кв. 45',
  note: null,
  leadId: 'l1',
};

export const doneMeasure: CrmEventCard = {
  id: 'e3',
  kind: 'measure',
  status: 'done',
  at: '2026-08-21T06:00:00.000Z',
  clientName: 'Ольга',
  clientPhone: null,
  address: 'Тула, Ленина 84',
  note: null,
  leadId: null,
};

export const cancelledService: CrmEventCard = {
  id: 'e4',
  kind: 'service',
  status: 'cancelled',
  at: '2026-08-25T12:00:00.000Z',
  clientName: 'Пётр',
  clientPhone: null,
  address: null,
  note: 'Перенесли на сентябрь',
  leadId: null,
};

export const monthEvents: readonly CrmEventCard[] = [
  plannedCall,
  plannedInstall,
  doneMeasure,
  cancelledService,
];

export const dayLead: CalendarLead = {
  id: 'l1',
  name: 'Сергей',
  phone: '+79107654321',
  topic: 'Установка кондиционера',
  at: '2026-08-23T05:12:00.000Z',
};

export const monthLeads: readonly CalendarLead[] = [dayLead];

/** Кто смотрит календарь в историях и тестах. */
export const viewerId = 'u1';

/** Весь день закрыт: 26 августа 2026, среда. */
export const wholeDayBlock: DayBlockCard = {
  id: 'b1',
  userId: viewerId,
  userName: 'Владелец',
  repeat: 'once',
  day: '2026-08-26',
  weekday: null,
  fromMin: null,
  toMin: null,
  reason: 'Семейные дела',
};

/** Запись к врачу на два часа 24 августа: день остаётся рабочим. */
export const doctorBlock: DayBlockCard = {
  id: 'b2',
  userId: viewerId,
  userName: 'Владелец',
  repeat: 'once',
  day: '2026-08-24',
  weekday: null,
  fromMin: 840,
  toMin: 960,
  reason: 'Врач',
};

/** Постоянный выходной по четвергам: 6, 13, 20 и 27 августа. */
export const weeklyBlock: DayBlockCard = {
  id: 'b3',
  userId: viewerId,
  userName: 'Владелец',
  repeat: 'weekly',
  day: null,
  weekday: 4,
  fromMin: null,
  toMin: null,
  reason: 'Выходной',
};

/** Вторая запись на тот же четверг: повторяемая и разовая складываются. */
export const extraThursdayBlock: DayBlockCard = {
  id: 'b4',
  userId: viewerId,
  userName: 'Владелец',
  repeat: 'once',
  day: '2026-08-20',
  weekday: null,
  fromMin: 600,
  toMin: 720,
  reason: 'Школа',
};

/** Чужая занятость: владелец её видит, но снять не может. */
export const foreignBlock: DayBlockCard = {
  id: 'b5',
  userId: 'u2',
  userName: 'Дмитрий',
  repeat: 'once',
  day: '2026-08-23',
  weekday: null,
  fromMin: 600,
  toMin: 720,
  reason: 'Учёба',
};

export const monthBlocks: readonly DayBlockCard[] = [
  wholeDayBlock,
  doctorBlock,
  weeklyBlock,
  extraThursdayBlock,
  foreignBlock,
];

/** Монтажник, которому назначают выезды в историях и тестах. */
export const dmitry: StaffCard = {
  id: 'u2',
  login: 'dmitry',
  name: 'Дмитрий Соколов',
  phone: '+7 (910) 111-22-33',
  role: 'installer',
  employment: 'self_employed',
  active: true,
  createdAt: '2026-05-01T09:00:00.000Z',
  lastLoginAt: null,
};

export const sergey: StaffCard = {
  id: 'u3',
  login: 'sergey',
  name: 'Сергей Панин',
  phone: null,
  role: 'installer',
  employment: null,
  active: true,
  createdAt: '2026-06-11T09:00:00.000Z',
  lastLoginAt: null,
};

export const installers: readonly StaffCard[] = [dmitry, sergey];

/** Монтаж у Дмитрия 23 августа, 10:00–13:00 по московскому времени. */
export const morningInstall: CalendarOrderCard = {
  id: 'o1',
  number: 1059,
  type: 'install',
  status: 'assigned',
  at: '2026-08-23T07:00:00.000Z',
  durationMin: 180,
  address: 'Тула, Первомайская, 12, кв. 4',
  clientName: 'Ирина Соколова',
  installerId: dmitry.id,
  installerName: dmitry.name,
};

/** 🔴 Второй наряд Дмитрия внахлёст: 12:00–14:00 — предупреждение, не запрет. */
export const clashingRepair: CalendarOrderCard = {
  id: 'o2',
  number: 1060,
  type: 'repair',
  status: 'assigned',
  at: '2026-08-23T09:00:00.000Z',
  durationMin: 120,
  address: 'Тула, Ленина, 84',
  clientName: 'Пётр Лапин',
  installerId: dmitry.id,
  installerName: dmitry.name,
};

/** ТО у Сергея в то же время: разные люди — это две бригады, а не конфликт. */
export const parallelService: CalendarOrderCard = {
  id: 'o3',
  number: 1061,
  type: 'service',
  status: 'in_progress',
  at: '2026-08-23T08:00:00.000Z',
  durationMin: 90,
  address: 'Тула, Пролетарская, 3',
  clientName: 'Ольга Титова',
  installerId: sergey.id,
  installerName: sergey.name,
};

/** Наряд без исполнителя: заведён, но человека ещё не назначили. */
export const looseOrder: CalendarOrderCard = {
  id: 'o4',
  number: 1062,
  type: 'install',
  status: 'new',
  at: '2026-08-25T12:00:00.000Z',
  durationMin: 120,
  address: 'Тула, Октябрьская, 40',
  clientName: 'Анна Дьякова',
  installerId: null,
  installerName: null,
};

export const monthOrders: readonly CalendarOrderCard[] = [
  morningInstall,
  clashingRepair,
  parallelService,
  looseOrder,
];

/** Занятость команды по дням — то, что даёт включённый переключатель в месяце. */
export const teamLoad: ReadonlyMap<string, readonly TeamDayMark[]> = new Map([
  [
    '2026-08-23',
    [
      {
        id: dmitry.id,
        title: dmitry.name ?? dmitry.login,
        initials: 'ДС',
        tone: personTone(dmitry.id),
        note: 'Занят 10:00–14:00',
      },
      {
        id: sergey.id,
        title: sergey.name ?? sergey.login,
        initials: 'СП',
        tone: personTone(sergey.id),
        note: 'Занят 11:00–12:30',
      },
    ],
  ],
  [
    '2026-08-26',
    [
      {
        id: dmitry.id,
        title: dmitry.name ?? dmitry.login,
        initials: 'ДС',
        tone: personTone(dmitry.id),
        note: 'День закрыт: семейные дела',
      },
    ],
  ],
]);
