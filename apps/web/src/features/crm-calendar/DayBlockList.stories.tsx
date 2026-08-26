import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { DayBlockList } from './DayBlockList';
import { doctorBlock, foreignBlock, monthBlocks, viewerId, wholeDayBlock } from './fixtures';

const meta = {
  title: 'Админка/Календарь/Занятость дня',
  component: DayBlockList,
  args: { day: '2026-08-26', blocks: [wholeDayBlock], viewerId },
} satisfies Meta<typeof DayBlockList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** День закрыт целиком: причина рядом, снять может только хозяин записи. */
export const ВесьДень: Story = {};

/** Запись к врачу на два часа: день остаётся рабочим. */
export const Диапазон: Story = {
  args: { day: '2026-08-24', blocks: [doctorBlock] },
};

/** Повторяемый выходной по четвергам — он же виден в каждом четверге месяца. */
export const Повторяемая: Story = {
  args: { day: '2026-08-27', blocks: monthBlocks },
};

/** Две записи на один день: постоянный выходной и разовая отлучка поверх него. */
export const НесколькоЗаписей: Story = {
  args: { day: '2026-08-20', blocks: monthBlocks },
};

/** 🔴 Чужая занятость: видно, кто и почему занят, но кнопок снятия нет. */
export const Чужая: Story = {
  args: { day: '2026-08-23', blocks: [foreignBlock] },
};

/** День никем не закрыт — пустое состояние говорит об этом словами. */
export const Пусто: Story = {
  args: { day: '2026-08-25', blocks: monthBlocks },
};
