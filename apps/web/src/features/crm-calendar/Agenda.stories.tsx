import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Agenda } from './Agenda';
import {
  crowdedOrders,
  dayNote,
  installers,
  lateInstall,
  manyLeads,
  monthBlocks,
  monthEvents,
  monthLeads,
  monthOrders,
  viewerId,
} from './fixtures';
import { weekColumns, type ScheduleSource } from './schedule';

/** 23 августа 2026, воскресенье — день, на который заведены фикстуры. */
const DAY = '2026-08-23';

function source(patch: Partial<ScheduleSource> = {}): ScheduleSource {
  return {
    events: monthEvents,
    orders: monthOrders,
    leads: monthLeads,
    blocks: [],
    viewerId,
    today: DAY,
    ...patch,
  };
}

const meta = {
  title: 'Админка/Календарь/Повестка недели',
  component: Agenda,
  parameters: { layout: 'padded' },
  args: { columns: weekColumns(source(), DAY) },
} satisfies Meta<typeof Agenda>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 🔴 Неделя списком: на телефоне семь колонок дают сорок пикселей на день. */
export const Неделя: Story = {};

/** Пустая неделя объясняет, что делать дальше, а не молчит. */
export const Пусто: Story = {
  args: { columns: weekColumns(source({ events: [], orders: [], leads: [] }), DAY) },
};

/** Плотный день: пять выездов и восемь заявок подряд — список не ломается. */
export const Плотно: Story = {
  args: { columns: weekColumns(source({ orders: crowdedOrders, leads: manyLeads }), DAY) },
};

/** 🔴 Переработка и заметка «не забыть»: час у одной есть, у другой нет. */
export const БезЧасаИПереработка: Story = {
  args: {
    columns: weekColumns(source({ events: [dayNote, lateInstall], orders: [], leads: [] }), DAY),
  },
};

/** Слой занятости: чужие отлучки идут в списке своей краской и с инициалами. */
export const СлойКоманды: Story = {
  args: {
    columns: weekColumns(source({ team: installers, blocks: monthBlocks }), DAY),
  },
};
