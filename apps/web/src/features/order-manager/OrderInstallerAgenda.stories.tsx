import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderInstallerAgenda } from './OrderInstallerAgenda';
import { installerCompanyOrder, installerOrder } from './fixtures';

/**
 * 🔴 День фиксирован, а не берётся у машины: иначе заголовок группы прыгал бы
 * между «Сегодня» и датой, и снимок истории расходился бы каждые сутки.
 */
const TODAY = '2026-08-28';

const morning = {
  ...installerCompanyOrder,
  id: 'a1',
  number: 128,
  at: '2026-08-28T06:00:00.000Z',
  address: 'Тула, Оборонная, 12, кв. 34',
};

const midday = {
  ...installerOrder,
  id: 'a2',
  number: 129,
  status: 'in_progress' as const,
  at: '2026-08-28T11:00:00.000Z',
};

const next = {
  ...installerCompanyOrder,
  id: 'a3',
  number: 130,
  at: '2026-08-29T07:00:00.000Z',
  address: 'Щёкино, Пионерская, 4',
  heightWorks: true,
};

const meta = {
  title: 'Админка/Заказы/Наряд дня монтажника',
  component: OrderInstallerAgenda,
  args: { orders: [morning, midday], when: 'today', today: TODAY },
} satisfies Meta<typeof OrderInstallerAgenda>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Сегодняшний день: два выезда, один уже в работе. */
export const Базовое: Story = {};

/** Неделя: группы по дням, а не по состоянию нарядов. */
export const Неделя: Story = {
  args: { orders: [morning, midday, next], when: 'week' },
};

/** 🔴 Пусто — и объяснено, почему: пустой экран без причины читается поломкой. */
export const Пусто: Story = {
  args: { orders: [] },
};

/** Пустая неделя: предлагать открыть неделю ещё раз незачем. */
export const ПустаяНеделя: Story = {
  args: { orders: [], when: 'week' },
};

/** Длинный адрес и много плашек не должны рвать карточку на телефоне. */
export const ДлинныеДанные: Story = {
  args: {
    orders: [
      {
        ...midday,
        address:
          'Тульская область, Ленинский район, посёлок Иншинский, дом 22, корпус 3, квартира 145',
        heightWorks: true,
      },
    ],
  },
};
