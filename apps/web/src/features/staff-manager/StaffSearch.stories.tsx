import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StaffSearch } from './StaffSearch';

/**
 * Поиск по команде (issue #602, макет `Team.png`): имя, логин, телефон.
 *
 * 🔴 Обычная форма с `method="get"` без единой строки JavaScript: запрос
 * уезжает в адрес сам, и поиск не стоит панели ни байта бюджета.
 */
const meta = {
  title: 'Админка/Поиск по команде',
  component: StaffSearch,
  args: { query: '' },
} satisfies Meta<typeof StaffSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Пустое: Story = {};

/** Есть что сбросить: рядом с кнопкой появляется выход ко всей команде. */
export const СЗапросом: Story = {
  args: { query: 'Соколов' },
};
