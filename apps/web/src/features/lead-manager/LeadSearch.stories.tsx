import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LeadSearch } from './LeadSearch';

/**
 * Поиск по очереди (issue #601): имя, телефон, адрес, тема, номер обращения.
 *
 * 🔴 Обычная форма с `method="get"` без единой строки JavaScript: запрос
 * уезжает в адрес сам, и поиск не стоит панели ни байта бюджета.
 */
const meta = {
  title: 'Админка/Поиск по заявкам',
  component: LeadSearch,
  args: { query: '' },
} satisfies Meta<typeof LeadSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Пустое: Story = {};

/** Есть что сбросить: рядом с кнопкой появляется выход к полному списку. */
export const СЗапросом: Story = {
  args: { query: 'Щёкино' },
};

/** Поиск внутри выбранной стопки: фильтр статуса едет скрытым полем. */
export const ВнутриФильтра: Story = {
  args: { query: '910', status: 'new' },
};
