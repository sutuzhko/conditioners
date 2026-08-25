import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StaffCardView } from './StaffCardView';
import {
  acceptingApi,
  activeInstaller,
  disabledInstaller,
  failingApi,
  namelessInstaller,
} from './fixtures';

const meta = {
  title: 'Админка/Монтажник в списке',
  component: StaffCardView,
  args: { staff: activeInstaller, api: acceptingApi },
} satisfies Meta<typeof StaffCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Работает: Story = {};

export const ДоступЗакрыт: Story = {
  args: { staff: disabledInstaller },
};

/** Имя не заполнено — показываем логин, а не пустое место. */
export const БезИмени: Story = {
  args: { staff: namelessInstaller },
};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};
