import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PanelNotFoundView } from './PanelNotFoundView';

/**
 * Страницы «не найдено» внутри панели — issue #631.
 *
 * 🔴 Историй четыре, потому что случаев два и выходов два. Несуществующий
 * адрес и несуществующая запись говорят разное: в первом случае проверяют
 * адрес, во втором проверять нечего — записи больше нет. Владельца ошибка
 * возвращает на сводку, монтажника — на его выезды: сводку он всё равно не
 * увидит, и ссылка на неё была бы вторым тупиком вместо выхода из первого.
 *
 * Истории живут рядом с маршрутами, а не в `widgets`: слою `widgets`
 * запрещено импортировать из `app`, а границы «не найдено» — файлы маршрута.
 */
const meta = {
  title: 'Админка/Страница не найдена',
  component: PanelNotFoundView,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PanelNotFoundView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Адреса нет: опечатка или устаревшая ссылка. Выход на сводку. */
export const АдресВладельцу: Story = { args: { kind: 'address', role: 'owner' } };

/** Тот же адрес глазами монтажника: выход на его выезды. */
export const АдресМонтажнику: Story = { args: { kind: 'address', role: 'installer' } };

/** Запись удалили: адрес верный, показывать нечего. */
export const ЗаписьВладельцу: Story = { args: { kind: 'record', role: 'owner' } };

/** Запись удалили, смотрит монтажник. */
export const ЗаписьМонтажнику: Story = { args: { kind: 'record', role: 'installer' } };
