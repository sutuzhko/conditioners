import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReviewTabs } from './ReviewTabs';

/**
 * Вкладки модерации отзывов: каждая — свой адрес (issue #339).
 *
 * Истории показывают то, чем вкладки отличаются друг от друга на экране:
 * какая отмечена открытой и как выглядит лента, пока раздел ещё грузится.
 */
const meta = {
  title: 'Админка/Отзывы/Вкладки',
  component: ReviewTabs,
  args: { active: 'pending' },
} satisfies Meta<typeof ReviewTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Раздел открылся без параметра: активна первая вкладка. */
export const Базовое: Story = {};

/** Открыты опубликованные — ключ адреса `published`. */
export const Опубликованные: Story = { args: { active: 'published' } };

/** «Все» снимает фильтр: здесь же видны архивные отзывы. */
export const Все: Story = { args: { active: 'all' } };

/**
 * Заготовка раздела: `loading.tsx` параметров адреса не получает и подсветить
 * может только не ту вкладку — поэтому не подсвечивает ни одной.
 */
export const БезВыбора: Story = { args: { active: undefined } };
