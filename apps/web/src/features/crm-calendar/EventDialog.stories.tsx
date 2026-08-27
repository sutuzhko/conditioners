import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EventDialog } from './EventDialog';
import { doctorBlock, monthOrders, viewerId, wholeDayBlock } from './fixtures';
import { DEFAULT_EVENT_MIN, type CrmEventDraft } from './model';

const draft: CrmEventDraft = {
  kind: 'call',
  day: '2026-08-24',
  time: '10:00',
  durationMin: DEFAULT_EVENT_MIN,
  clientName: '',
  clientPhone: '',
  address: '',
  note: '',
  leadId: null,
};

const meta = {
  title: 'Админка/Календарь/Окно дела',
  component: EventDialog,
  parameters: { layout: 'fullscreen' },
  args: { open: true, onClose: () => {}, onSaved: () => {}, draft },
} satisfies Meta<typeof EventDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Новое дело: вид, дата, время и длительность — час по умолчанию (ADR-138). */
export const Новое: Story = {};

/** Правка: те же поля, другой заголовок, значения заполнены. */
export const Правка: Story = {
  args: {
    id: 'e1',
    draft: {
      ...draft,
      kind: 'measure',
      durationMin: 90,
      clientName: 'Ирина Соколова',
      clientPhone: '+7 (900) 123-45-67',
      address: 'Тула, Первомайская, 12, кв. 4',
      note: 'Пятый этаж без лифта',
    },
  },
};

/** Заготовка из заявки: поля подставлены, перебивать телефон руками не нужно. */
export const ИзЗаявки: Story = {
  args: {
    draft: {
      ...draft,
      clientName: 'Сергей',
      clientPhone: '+7 (910) 765-43-21',
      address: 'Тула, Пролетарская 12, кв. 45',
      leadId: 'l1',
    },
  },
};

/** 🔴 День закрыт: форма предупреждает, но сохранить не мешает (ADR-115). */
export const ДеньЗакрыт: Story = {
  args: {
    draft: { ...draft, day: '2026-08-26' },
    blocks: [wholeDayBlock],
    viewerId,
  },
};

/** Отлучка на часы: предупреждение появляется, только когда дело в неё попадает. */
export const ОтлучкаНаЧасы: Story = {
  args: {
    draft: { ...draft, time: '14:30' },
    blocks: [doctorBlock],
    viewerId,
  },
};

/** 🔴 Пересечение со своим выездом: предупреждение, а не запрет (ADR-114). */
export const ПересечениеСВыездом: Story = {
  args: {
    draft: { ...draft, day: '2026-08-23', time: '11:00', durationMin: 60 },
    orders: monthOrders,
    viewerId: 'u2',
  },
};
