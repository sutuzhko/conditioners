import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderList } from './OrderList';
import { emptyPage, longPage, page } from './fixtures';

const meta = {
  title: 'Админка/Заказы/Список нарядов',
  component: OrderList,
  args: { page },
} satisfies Meta<typeof OrderList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Список перерос страницу: появляется разбивка, фильтр в ней сохраняется. */
export const СоСтраницами: Story = {
  args: { page: longPage, filters: { tab: 'all', query: 'Соколова' } },
};

/** Нарядов нет вовсе — это приглашение завести первый. */
export const Пусто: Story = {
  args: { page: emptyPage },
};

/** 🔴 Пусто по фильтру — другая новость: наряд лежит в другой стопке. */
export const ПустоПоФильтру: Story = {
  args: { page: emptyPage, filters: { tab: 'cancelled', period: 'prev' } },
};

/** Экран монтажника: у пустоты там своя причина. */
export const ПустоУМонтажника: Story = {
  args: { page: emptyPage, forInstaller: true },
};
