import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClientList } from './ClientList';
import { emptyPage, longPage, page } from './fixtures';

const meta = {
  title: 'Админка/Список клиентов',
  component: ClientList,
  args: { page },
} satisfies Meta<typeof ClientList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** База переросла страницу: появляется разбивка. */
export const СоСтраницами: Story = {
  args: { page: longPage },
};

export const Пусто: Story = {
  args: { page: emptyPage },
};

/** Искали — не нашли. База при этом не пуста, и объяснение другое. */
export const НичегоНеНайдено: Story = {
  args: { page: emptyPage, query: 'Соколова' },
};
