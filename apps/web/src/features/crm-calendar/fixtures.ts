/** Данные для историй и тестов календаря работ. */
import type { StaffCard } from '@/entities/staff/model';

import type { CalendarLead, CalendarOrderCard, CrmEventCard, DayBlockCard } from './model';

/** 23 августа 2026, 10:00 по московскому времени. */
export const plannedCall: CrmEventCard = {
  id: 'e1',
  kind: 'call',
  status: 'planned',
  at: '2026-08-23T07:00:00.000Z',
  durationMin: 30,
  overtimeMin: 0,
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
  durationMin: 240,
  overtimeMin: 0,
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
  durationMin: 60,
  overtimeMin: 0,
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
  /* Работа до девяти вечера: два часа за рабочим окном (ADR-138). */
  durationMin: 240,
  overtimeMin: 120,
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

/** Заметка «не забыть»: висит на дне, а не на часе, — полоса «весь день». */
export const dayNote: CrmEventCard = {
  id: 'e5',
  kind: 'note',
  status: 'planned',
  at: '2026-08-23T06:00:00.000Z',
  durationMin: 60,
  overtimeMin: 0,
  clientName: 'Забрать трассу со склада',
  clientPhone: null,
  address: null,
  note: null,
  leadId: null,
};

/**
 * Вечерний монтаж: с 19:00 до 22:00 при окне до девятнадцати — три часа
 * переработки. Число готовое, как его отдаёт сервер (ADR-138).
 */
export const lateInstall: CrmEventCard = {
  id: 'e6',
  kind: 'install',
  status: 'planned',
  at: '2026-08-23T16:00:00.000Z',
  durationMin: 180,
  overtimeMin: 180,
  clientName: 'Анна Дьякова',
  clientPhone: '+7 (920) 000-11-22',
  address: 'Тула, Октябрьская, 40',
  note: 'Клиент просил закончить сегодня',
  leadId: null,
};

/** Пять выездов на одно время: ширины на всех не хватает — идёт лесенка. */
export const crowdedOrders: readonly CalendarOrderCard[] = [
  morningInstall,
  clashingRepair,
  parallelService,
  { ...morningInstall, id: 'o5', number: 1063, at: '2026-08-23T07:30:00.000Z' },
  { ...parallelService, id: 'o6', number: 1064, at: '2026-08-23T08:15:00.000Z' },
];

/** Восемь заявок за день: полоса «весь день» сворачивается (CRM §3.5.1). */
export const manyLeads: readonly CalendarLead[] = Array.from({ length: 8 }, (_, index) => ({
  id: `l${index + 2}`,
  name: `Заявка ${index + 1}`,
  phone: '+79101112233',
  topic: 'Установка кондиционера',
  at: `2026-08-23T0${index}:15:00.000Z`,
}));
