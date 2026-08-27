import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderChecklist } from './OrderChecklist';
import { acceptingWorkApi, checklist, failingWorkApi, pendingWorkApi } from './fixtures';

const meta = {
  title: 'Админка/Заказы/Чеклист выезда',
  component: OrderChecklist,
  args: { api: acceptingWorkApi, items: checklist },
} satisfies Meta<typeof OrderChecklist>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 🔴 Собранные из наряда пункты и один дописанный — с плашкой и кнопкой удаления. */
export const Базовое: Story = {};

/** Пусто: наряд без позиций, чеклист ещё не собирали. */
export const Пусто: Story = {
  args: { items: [] },
};

/** Всё собрано: счётчик показывает полный сбор. */
export const СобраноПолностью: Story = {
  args: { items: checklist.map((item) => ({ ...item, done: true })) },
};

/** Запрос не отвечает: добавление и пересборка заняты. */
export const Отправка: Story = {
  args: { api: pendingWorkApi },
};

/** Сервер отказал: собранный пункт удалить нельзя, ошибка объясняет почему. */
export const Ошибка: Story = {
  args: { api: failingWorkApi },
};

/** Наряд закрыт: список только на чтение. */
export const Отключено: Story = {
  args: { disabled: true },
};
