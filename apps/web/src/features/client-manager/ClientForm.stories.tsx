import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClientForm } from './ClientForm';
import { clientManagerContent as texts } from './content';
import { acceptingApi, client, failingApi } from './fixtures';

const filled = {
  name: client.name,
  phone: client.phone,
  address: client.address ?? '',
  note: client.note ?? '',
};

const meta = {
  title: 'Админка/Форма клиента',
  component: ClientForm,
  args: { api: acceptingApi, confirmRemove: async () => true },
} satisfies Meta<typeof ClientForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Заведение: Story = {};

export const Правка: Story = {
  args: {
    clientId: client.id,
    initial: filled,
    title: texts.cardTitle,
    hint: texts.cardHint,
    removable: true,
  },
};

/** Телефон уже записан за другим человеком: сервер называет поле. */
export const ЗанятыйТелефон: Story = {
  args: { api: failingApi },
};
