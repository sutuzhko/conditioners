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

/**
 * Вход в архив (ADR-300, issue #514). Вкладки нет на макете: он рисовался до
 * того, как стало ясно, что архивные не удаляются, значит их только больше, и
 * без своего входа до снятого полгода назад отзыва не добраться.
 */
export const ВАрхиве: Story = { args: { active: 'archived' } };

/** «Все» снимает фильтр целиком: сквозной список по всем статусам. */
export const Все: Story = { args: { active: 'all' } };

/**
 * Заготовка раздела: `loading.tsx` параметров адреса не получает и подсветить
 * может только не ту вкладку — поэтому не подсвечивает ни одной.
 */
export const БезВыбора: Story = { args: { active: undefined } };
