import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClientSearch } from './ClientSearch';

const meta = {
  title: 'Админка/Поиск клиента',
  component: ClientSearch,
  args: { query: '', total: 24 },
} satisfies Meta<typeof ClientSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Запрос задан: поле открывается заполненным, рядом появляется сброс. */
export const СЗапросом: Story = {
  args: { query: 'Соколова', total: 3 },
};

export const НичегоНеНайдено: Story = {
  args: { query: 'Иванов', total: 0 },
};
