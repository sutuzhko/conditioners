import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderDocs } from './OrderDocs';
import { acceptingWorkApi, docs, failingWorkApi, pendingWorkApi } from './fixtures';

const meta = {
  title: 'Админка/Заказы/Документы',
  component: OrderDocs,
  args: {
    api: acceptingWorkApi,
    docs,
    editable: true,
    /* Подтверждение выведено пропом: история не открывает окно (ADR-113). */
    confirmRemove: async () => true,
  },
} satisfies Meta<typeof OrderDocs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Владелец: список закрытых ссылок и форма загрузки. */
export const Базовое: Story = {};

export const Пусто: Story = {
  args: { docs: [] },
};

/**
 * 🔴 Монтажник: документы только читает. Ссылка ведёт на закрытый маршрут —
 * файл отдаётся лишь при сессии и доступе к этому наряду (CRM.md §9).
 */
export const ГлазамиМонтажника: Story = {
  args: { editable: false },
};

export const ПустоУМонтажника: Story = {
  args: { editable: false, docs: [] },
};

export const Отправка: Story = {
  args: { api: pendingWorkApi },
};

export const Ошибка: Story = {
  args: { api: failingWorkApi },
};
