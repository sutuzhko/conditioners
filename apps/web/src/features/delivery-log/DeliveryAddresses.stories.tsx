import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { DeliveryAddresses } from './DeliveryAddresses';
import {
  acceptingAddresses,
  boundInstaller,
  failingAddresses,
  firedInstaller,
  freshInstaller,
  owner,
  people,
} from './fixtures';

const meta = {
  title: 'Админка/Адреса доставки',
  component: DeliveryAddresses,
  args: { people, api: acceptingAddresses },
} satisfies Meta<typeof DeliveryAddresses>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Команда: Story = {};

/** 🔴 Человек ещё не привязал телеграм: панель показывает код для диктовки. */
export const БезПривязки: Story = {
  args: { people: [freshInstaller] },
};

/** Чат привязан: кода больше нет, вместо него — отвязка. */
export const Привязан: Story = {
  args: { people: [owner, boundInstaller] },
};

/** Доступ отключён, но история за человеком остаётся. */
export const Отключённый: Story = {
  args: { people: [firedInstaller] },
};

/** Никого, кроме владельца, в команде нет. */
export const ТолькоВладелец: Story = {
  args: { people: [owner] },
};

export const ОтказСервера: Story = {
  args: { api: failingAddresses },
};

export const Пусто: Story = {
  args: { people: [] },
};
