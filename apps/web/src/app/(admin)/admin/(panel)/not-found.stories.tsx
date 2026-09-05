import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PanelNotFoundView } from './PanelNotFoundView';

/**
 * Страница «не найдено» внутри панели — issue #631.
 *
 * 🔴 Историй две, потому что выходов два. Владельца ошибка в адресе возвращает
 * на сводку, монтажника — на его выезды: сводку он всё равно не увидит, и
 * ссылка на неё была бы вторым тупиком вместо выхода из первого.
 *
 * История живёт рядом с маршрутом, а не в `widgets`: слою `widgets` запрещено
 * импортировать из `app`, а граница «не найдено» — файл маршрута.
 */
const meta = {
  title: 'Админка/Страница не найдена',
  component: PanelNotFoundView,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PanelNotFoundView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Владелец: выход на сводку. */
export const Владелец: Story = { args: { role: 'owner' } };

/** Монтажник: выход на свои выезды. */
export const Монтажник: Story = { args: { role: 'installer' } };
