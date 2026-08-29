import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CalendarHelp } from './CalendarHelp';

const meta = {
  title: 'Календарь/Подсказка по клавишам',
  component: CalendarHelp,
  args: { open: true, onClose: () => undefined },
} satisfies Meta<typeof CalendarHelp>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Открыта: так её видит человек, нажавший «?» или кнопку в шапке. */
export const Открыта: Story = {};

/** Закрыта: окна нет, на экране остаётся календарь. */
export const Закрыта: Story = {
  args: { open: false },
};
