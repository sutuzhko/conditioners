import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClientLeads } from './ClientLeads';
import { leads } from './fixtures';

const meta = {
  title: 'Админка/Обращения клиента',
  component: ClientLeads,
  args: { leads },
} satisfies Meta<typeof ClientLeads>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Клиент заведён руками или пришёл по звонку. */
export const Пусто: Story = {
  args: { leads: [] },
};
