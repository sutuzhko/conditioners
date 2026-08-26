import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClientAdd } from './ClientAdd';
import { acceptingApi, failingApi } from './fixtures';

const meta = {
  title: 'Админка/Заведение клиента',
  component: ClientAdd,
  args: { api: acceptingApi },
} satisfies Meta<typeof ClientAdd>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Форма свёрнута: заводят клиента реже, чем ищут его в списке. */
export const Свёрнуто: Story = {};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};
