import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LeadCardView } from './LeadCardView';
import { acceptingUpdate, bareLead, failingUpdate, newLead, workedLead } from './fixtures';

const meta = {
  title: 'Админка/Заявка',
  component: LeadCardView,
  args: { lead: newLead, update: acceptingUpdate },
} satisfies Meta<typeof LeadCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Новая: Story = {};

/** Только обязательные поля: пустые не показываются вовсе. */
export const БезПодробностей: Story = {
  args: { lead: bareLead },
};

export const ВРаботе: Story = {
  args: { lead: workedLead },
};

export const ОтказСервера: Story = {
  args: { update: failingUpdate },
};
