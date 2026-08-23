import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CalendarGrid } from './CalendarGrid';
import { monthEvents, monthLeads } from './fixtures';

const meta = {
  title: 'Админка/Календарь/Сетка месяца',
  component: CalendarGrid,
  args: {
    month: '2026-08',
    selected: '2026-08-23',
    today: '2026-08-23',
    events: monthEvents,
    leads: monthLeads,
  },
} satisfies Meta<typeof CalendarGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Обычный месяц: звонки, монтажи, сделанное и отменённое. */
export const Рабочий: Story = {};

/** Ничего не запланировано — первый месяц после установки панели. */
export const Пустой: Story = {
  args: { events: [], leads: [] },
};

/** Выбран день не из этого месяца: хвост сетки такой же рабочий. */
export const ХвостМесяца: Story = {
  args: { selected: '2026-09-01', today: '2026-08-23' },
};

/** Сегодня и выбранный день — разные: у них разные пометки. */
export const ДругойДень: Story = {
  args: { selected: '2026-08-25', today: '2026-08-23' },
};
