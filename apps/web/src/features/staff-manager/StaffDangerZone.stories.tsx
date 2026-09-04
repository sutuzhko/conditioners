import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StaffDangerZone } from './StaffDangerZone';
import { acceptingApi, activeInstaller, disabledInstaller, failingApi } from './fixtures';

/**
 * Опасная зона карточки монтажника (issue #351).
 *
 * 🔴 Отделена рамкой на всех ширинах и стоит последней: до неё доскроллят
 * осознанно. Кнопка «Удалить» отключена, пока за человеком закреплены наряды,
 * и причина написана рядом — отключённая кнопка без объяснения хуже
 * отсутствующей.
 */
const meta = {
  title: 'Админка/Опасная зона монтажника',
  component: StaffDangerZone,
  args: { staff: activeInstaller, orders: 0, api: acceptingApi, confirmRemove: async () => true },
} satisfies Meta<typeof StaffDangerZone>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Нарядов за человеком нет: удалить можно. */
export const Базовое: Story = {};

/** 🔴 Наряды закреплены: удаление отключено, причина написана рядом. */
export const УдалитьНельзя: Story = {
  args: { orders: 3 },
};

/** Доступ уже закрыт: кнопка предлагает обратное действие. */
export const ДоступЗакрыт: Story = {
  args: { staff: disabledInstaller },
};

/** Сервер не принял: отказ стоит на месте, а не исчезает молча. */
export const ОтказСервера: Story = {
  args: { api: failingApi, orders: 0 },
};
