import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CalendarCreate } from './CalendarCreate';
import { CalendarStage } from './CalendarStage';
import { EventChip } from './EventChip';
import { doctorBlock, monthEvents, monthOrders, viewerId } from './fixtures';
import { dayColumns, type ScheduleItem } from './schedule';

const DAY = '2026-08-23';

function items(): readonly ScheduleItem[] {
  const column = dayColumns(
    {
      events: monthEvents,
      orders: monthOrders,
      leads: [],
      blocks: [{ ...doctorBlock, day: DAY }],
      viewerId,
      today: DAY,
    },
    DAY,
  )[0];

  return (column?.timed ?? []).map((placed) => placed.item);
}

const meta = {
  title: 'Админка/Календарь/Управляющий слой',
  component: CalendarStage,
  parameters: { layout: 'padded' },
  args: {
    day: DAY,
    viewerId,
    children: (
      <div style={{ display: 'grid', gap: '6px' }}>
        <CalendarCreate day={DAY} canBlock />
        {items().map((item) => (
          <EventChip item={item} key={item.id} variant="bar" />
        ))}
      </div>
    ),
  },
} satisfies Meta<typeof CalendarStage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Слой в покое: сетка (здесь — список записей) приходит разметкой, действия
 * раздаются контекстом. Нажатие на запись открывает карточку, «Новое дело» —
 * форму.
 */
export const Покой: Story = {};

/** 🔴 Форма открыта сразу: так календарь встречает переход «В календарь» из заявки. */
export const ИзЗаявки: Story = {
  args: {
    preset: {
      kind: 'call',
      clientName: 'Ирина Соколова',
      clientPhone: '+7 (900) 123-45-67',
      address: 'Тула, Первомайская, 12',
      note: 'Просила перезвонить после шести',
    },
  },
};

/** Пустой день: заводить нечего, но кнопки заведения на месте. */
export const Пусто: Story = {
  args: { children: <CalendarCreate day={DAY} canBlock /> },
};
