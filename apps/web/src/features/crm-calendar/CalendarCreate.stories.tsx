import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CalendarCreate } from './CalendarCreate';

const meta = {
  title: 'Админка/Календарь/Кнопки заведения',
  component: CalendarCreate,
  args: { day: '2026-08-23' },
} satisfies Meta<typeof CalendarCreate>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Только новое дело — так шапка выглядит там, где занятость не заводят. */
export const ТолькоДело: Story = {};

/** 🔴 Занятость заводят себе обе роли (ADR-115): кнопка стоит рядом. */
export const СЗанятостью: Story = {
  args: { canBlock: true },
};
