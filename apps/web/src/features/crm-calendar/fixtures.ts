/** Данные для историй и тестов календаря работ. */
import type { CalendarLead, CrmEventCard } from './model';

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
