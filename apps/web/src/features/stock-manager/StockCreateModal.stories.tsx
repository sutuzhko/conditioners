import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StockCreateModal } from './StockCreateModal';
import { acceptingApi, failingApi, itemRefs, moveDraft, people, products, zones } from './fixtures';

/**
 * Окна создания раздела: позиция, зона, движение (ADR-137).
 *
 * У каждого свой адрес — в приложении окно рисует перехватывающий маршрут, а
 * прямой заход по тому же адресу отдаёт страницу. В историях показано само
 * окно: маршрут задаёт раздел.
 */
const meta = {
  title: 'Админка/Склад · Окна создания',
  component: StockCreateModal,
  parameters: { layout: 'fullscreen' },
  args: { creation: { kind: 'item', products }, api: acceptingApi },
} satisfies Meta<typeof StockCreateModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Новая позиция справочника: остаток здесь не задаётся — его заводит приход. */
export const Позиция: Story = {};

/** Новая зона: у машины обязателен хозяин, у склада его не бывает. */
export const Зона: Story = {
  args: { creation: { kind: 'zone', people } },
};

/**
 * Движение после перетаскивания ячейки: позиция и обе зоны подставлены
 * адресом, курсор стоит в количестве.
 */
export const Перемещение: Story = {
  args: {
    creation: { kind: 'move', items: itemRefs.slice(0, 1), zones, initial: moveDraft },
  },
};

/** Сервер не принял: окно остаётся открытым и объясняет отказ. */
export const ОтказСервера: Story = {
  args: { api: failingApi },
};
