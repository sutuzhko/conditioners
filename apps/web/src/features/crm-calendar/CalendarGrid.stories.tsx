import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CalendarGrid } from './CalendarGrid';
import {
  crowdedOrders,
  dayNote,
  installers,
  manyLeads,
  monthBlocks,
  monthEvents,
  monthLeads,
  monthOrders,
  viewerId,
  wholeDayBlock,
} from './fixtures';
import { monthColumns, type ScheduleSource } from './schedule';

const MONTH = '2026-08';
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
  title: 'Админка/Календарь/Сетка месяца',
  component: CalendarGrid,
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
        {
          rule: 'target-size',
          reason: 'issue #470 — чипы событий 17–22px и ссылки дня 18.6px ниже минимума AA',
        },
      ],
    },
  },
  args: { columns: monthColumns(source(), MONTH) },
} satisfies Meta<typeof CalendarGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Месяц целиком: строка «точка · время · название» вместо капсул. */
export const Месяц: Story = {};

/** Пустой месяц — первые дни после установки панели. */
export const Пусто: Story = {
  args: { columns: monthColumns(source({ events: [], orders: [], leads: [] }), MONTH) },
};

/** Одна запись на весь месяц: клетки всё равно одинаковой высоты. */
export const ОднаЗапись: Story = {
  args: {
    columns: monthColumns(
      source({ events: [monthEvents[0] ?? dayNote], orders: [], leads: [] }),
      MONTH,
    ),
  },
};

/** 🔴 Переполнение: лишние записи сворачиваются в «Ещё N», а не режутся молча. */
export const Переполнение: Story = {
  args: { columns: monthColumns(source({ orders: crowdedOrders, leads: manyLeads }), MONTH) },
};

/** Наложение по времени: в месяце оно видно как две строки на один час. */
export const Наложение: Story = {
  args: {
    columns: monthColumns(source({ orders: monthOrders.slice(0, 2), leads: [] }), MONTH),
  },
};

/** Занятость: закрытый целиком день идёт строкой, а не краской клетки. */
export const СЗанятостью: Story = {
  args: {
    columns: monthColumns(source({ blocks: [wholeDayBlock, ...monthBlocks.slice(1)] }), MONTH),
  },
};

/** 🔴 Слой команды: отлучки монтажников со временем, а не капсулы с инициалами. */
export const СлойКоманды: Story = {
  args: {
    columns: monthColumns(
      source({
        team: installers,
        blocks: monthBlocks.map((block) => ({ ...block, userId: 'u2' })),
      }),
      MONTH,
    ),
  },
};

/** Сегодня: число в кружке и плотная рамка — видно и в монохромном режиме. */
export const Сегодня: Story = {
  args: { columns: monthColumns(source({ today: DAY }), MONTH) },
};
