import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {
  crowdedOrders,
  monthBlocks,
  monthEvents,
  monthLeads,
  monthOrders,
  viewerId,
} from './fixtures';
import { DEFAULT_WORK_WINDOW, hourRangeOf, weekColumns, type ScheduleSource } from './schedule';
import { WeekBoard } from './WeekBoard';

/** 23 августа 2026, воскресенье — день, на который заведены фикстуры. */
const DAY = '2026-08-23';
const RANGE = hourRangeOf(DEFAULT_WORK_WINDOW);

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
  title: 'Админка/Календарь/Неделя',
  component: WeekBoard,
  parameters: {
    layout: 'padded',
    // Допущения инвариантов — причины в reason (ADR-230)
    invariants: {
      allow: [
        {
          rule: 'occlusion',
          reason:
            'события лежат поверх сетки часов по эталону Apple Calendar (ADR-128, ADR-138, ADR-140); час под событием достижим через событие',
        },
      ],
    },
  },
  args: {
    columns: weekColumns(source(), DAY),
    range: RANGE,
    // 14:20 по московскому времени: линия «сейчас» видна в рабочем окне
    nowMin: 14 * 60 + 20,
  },
} satisfies Meta<typeof WeekBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 🔴 Ниже 600px на месте часовой сетки стоит повестка (issue #47): семь
 * колонок в 375px дают сорок пикселей на день, и от записи остаётся один
 * символ. Выше 600px — та же неделя часами.
 */
export const Базовая: Story = {};

/** Пустая неделя: и сетка, и повестка обязаны оставаться понятными. */
export const Пусто: Story = {
  args: { columns: weekColumns(source({ events: [], orders: [], leads: [] }), DAY) },
};

/** Плотная неделя с занятостью: лесенка в сетке, список в повестке. */
export const Плотно: Story = {
  args: { columns: weekColumns(source({ orders: crowdedOrders, blocks: monthBlocks }), DAY) },
};
