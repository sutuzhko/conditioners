import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LeadStale } from './LeadStale';

/**
 * Плашка о залежавшемся обращении (issue #601, макет `Leads.png`) — то, ради
 * чего раздел открывают утром. Она называет номер и цену молчания словами, а
 * не подсвечивает строку красным.
 */
const meta = {
  title: 'Админка/Залежавшееся обращение',
  component: LeadStale,
  args: { number: 39, leadId: 'l3' },
} satisfies Meta<typeof LeadStale>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Длинный номер: он приходит из счётчика и растёт вместе с очередью. */
export const ДлинныйНомер: Story = {
  args: { number: 10_418 },
};
