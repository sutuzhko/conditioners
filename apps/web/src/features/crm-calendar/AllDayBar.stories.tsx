import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AllDayBar } from './AllDayBar';
import { dayNote, manyLeads, monthLeads, viewerId, wholeDayBlock } from './fixtures';
import { dayColumns, type ScheduleItem, type ScheduleSource } from './schedule';

const DAY = '2026-08-23';
const TEMPLATE = 'var(--cal-rail) minmax(0, 1fr)';

function itemsOf(patch: Partial<ScheduleSource> = {}): readonly ScheduleItem[] {
  const column = dayColumns(
    { events: [], orders: [], leads: [], blocks: [], viewerId, today: DAY, ...patch },
    DAY,
  )[0];

  return column?.allDay ?? [];
}

const meta = {
  title: 'Админка/Календарь/Полоса «весь день»',
  component: AllDayBar,
  parameters: { layout: 'padded' },
  args: {
    columns: [{ key: DAY, items: itemsOf({ leads: monthLeads }) }],
    template: TEMPLATE,
  },
} satisfies Meta<typeof AllDayBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 🔴 Заявка с сайта живёт здесь, пока ей не назначили время (ADR-128). */
export const Заявка: Story = {};

/** Пустая полоса: она остаётся на месте — сетка не должна прыгать. */
export const Пусто: Story = {
  args: { columns: [{ key: DAY, items: [] }] },
};

/** Заметка «не забыть» и закрытый целиком день — тоже про день, а не про час. */
export const ЗаметкаИЗанятость: Story = {
  args: {
    columns: [
      {
        key: DAY,
        items: itemsOf({ events: [dayNote], blocks: [{ ...wholeDayBlock, day: DAY }] }),
      },
    ],
  },
};

/** 🔴 Переполнение: восемь заявок сворачиваются, а не съедают сетку часов. */
export const Переполнение: Story = {
  args: { columns: [{ key: DAY, items: itemsOf({ leads: manyLeads }) }] },
};

/** Неделя: у каждой колонки своя стопка, и ряд общий на все семь. */
export const Неделя: Story = {
  args: {
    columns: [
      { key: '2026-08-21', items: [] },
      { key: DAY, items: itemsOf({ leads: monthLeads }) },
      { key: '2026-08-24', items: itemsOf({ events: [dayNote] }) },
    ],
    template: 'var(--cal-rail) repeat(3, minmax(0, 1fr))',
  },
};
