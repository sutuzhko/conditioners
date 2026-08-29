import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { CrmSearchHit } from '@/entities/crm/model';

import { CalendarSearch } from './CalendarSearch';

const hits: CrmSearchHit[] = [
  {
    kind: 'order',
    id: 'o1',
    number: 1059,
    clientName: 'Пётр Соколов',
    address: 'Тула, ул. Первомайская, 12, кв. 44',
    at: '2026-09-01T07:00:00.000Z',
  },
  {
    kind: 'event',
    id: 'e1',
    eventKind: 'measure',
    clientName: 'Ирина Соколова',
    address: 'Тула, ул. Кирова, 12',
    at: '2026-08-20T09:00:00.000Z',
  },
  {
    kind: 'lead',
    id: 'l1',
    topic: 'Установка кондиционера',
    clientName: 'Соколов Андрей',
    address: null,
    at: '2026-08-15T10:00:00.000Z',
  },
];

const meta = {
  title: 'Календарь/Поиск',
  component: CalendarSearch,
  args: { team: false, find: async () => hits },
} satisfies Meta<typeof CalendarSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Пустое поле: список закрыт, шапка занята одним полем. */
export const Пустое: Story = {};

/** Ничего не нашлось: подсказываем, чем ещё можно искать. */
export const НичегоНеНашлось: Story = {
  args: { find: async () => [] },
};

/** Отказ сервера: объясняем и оставляем поле рабочим. */
export const ОтказСервера: Story = {
  args: {
    find: async () => {
      throw new Error('связь потеряна');
    },
  },
};
