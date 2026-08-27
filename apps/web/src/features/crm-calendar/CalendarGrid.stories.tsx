import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CalendarGrid } from './CalendarGrid';
import { monthBlocks, monthEvents, monthLeads, monthOrders, teamLoad, viewerId } from './fixtures';

const meta = {
  title: 'Админка/Календарь/Сетка месяца',
  component: CalendarGrid,
  args: {
    month: '2026-08',
    selected: '2026-08-23',
    today: '2026-08-23',
    events: monthEvents,
    orders: [],
    leads: monthLeads,
    blocks: [],
    viewerId,
  },
} satisfies Meta<typeof CalendarGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Обычный месяц: звонки, монтажи, сделанное и отменённое. */
export const Рабочий: Story = {};

/** 🔴 Наряды в сетке наравне с делами: у наряда номер и сплошная полоса слева. */
export const СНарядами: Story = {
  args: { orders: monthOrders },
};

/**
 * 🔴 Занятость команды в месяце (ADR-123): полоска на человека вместо попытки
 * нарисовать часы в клетке дня. Краска закреплена за человеком, рядом инициалы.
 */
export const ЗанятостьКоманды: Story = {
  args: { orders: monthOrders, teamLoad },
};

/** Ничего не запланировано — первый месяц после установки панели. */
export const Пустой: Story = {
  args: { events: [], orders: [], leads: [], blocks: [] },
};

/** Занятость в сетке: закрытый целиком день, часы, повторяемый выходной и чужая. */
export const СЗанятостью: Story = {
  args: { blocks: monthBlocks },
};

/** 🔴 Суббота и воскресенье ничем не выделены: выходные отмечает человек. */
export const ВыходныеНеЗашиты: Story = {
  args: { events: [], orders: [], leads: [], blocks: [] },
};

/** Выбран день не из этого месяца: хвост сетки такой же рабочий. */
export const ХвостМесяца: Story = {
  args: { selected: '2026-09-01', today: '2026-08-23' },
};

/** Сегодня и выбранный день — разные: у них разные пометки. */
export const ДругойДень: Story = {
  args: { selected: '2026-08-25', today: '2026-08-23' },
};
