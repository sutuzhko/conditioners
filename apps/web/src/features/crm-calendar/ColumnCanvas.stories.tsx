import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ColumnCanvas } from './ColumnCanvas';
import { DEFAULT_WORK_WINDOW, hourRangeOf, isOffHour } from './schedule';

const DAY = '2026-08-23';

function offHours(window = DEFAULT_WORK_WINDOW): readonly number[] {
  const range = hourRangeOf(window);
  return range.hours.filter((hour) => isOffHour(range, hour));
}

const meta = {
  title: 'Админка/Календарь/Пустое место колонки',
  component: ColumnCanvas,
  parameters: { layout: 'padded' },
  args: { day: DAY, offHours: offHours() },
  decorators: [
    // полоса покрывает сутки: без высоты часы схлопнулись бы в ноль
    (Story) => (
      <div style={{ position: 'relative', height: '1152px', width: '220px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ColumnCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Рабочее окно 9:00–19:00: ночь и вечер помечены нерабочими часами. */
export const РабочееОкно: Story = {};

/** Круглосуточная смена: нерабочих часов нет вовсе. */
export const БезНерабочихЧасов: Story = {
  args: { offHours: [] },
};

/** 🔴 Сдвинутое окно: переработка считается от настройки, а не от суток. */
export const РаннееОкно: Story = {
  args: { offHours: offHours({ fromMin: 7 * 60, toMin: 16 * 60 }) },
};

/** 🔴 В неделе часы не забирают клавиатуру: путь с клавиатуры — кнопка в шапке. */
export const БезКлавиатуры: Story = {
  args: { reachable: false },
};
