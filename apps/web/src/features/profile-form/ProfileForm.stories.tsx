import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ProfileForm } from './ProfileForm';
import { acceptingApi, failingApi, installerMe, ownerMe } from './fixtures';

const meta = {
  title: 'Админка/Профиль',
  component: ProfileForm,
  args: { me: ownerMe, api: acceptingApi },
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Владелец: Story = {};

export const Монтажник: Story = {
  args: { me: installerMe },
};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};
