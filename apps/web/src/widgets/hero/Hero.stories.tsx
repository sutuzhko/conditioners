import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Hero } from './Hero';
import { discountedModels, heroModels, heroStats, saleNow, singleModel } from './fixtures';

/**
 * Первый экран. Данные приходят пропсами: виджет не ходит в базу, поэтому
 * в Storybook он рисуется целиком (docs/ORCHESTRATION.md, волна 3).
 */
const meta = {
  title: 'Блоки/Первый экран',
  component: Hero,
  parameters: { layout: 'fullscreen' },
  args: {
    products: heroModels,
    stats: heroStats,
    note: 'Работаем по всей Туле и области',
  },
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Несколько моделей' };

export const Single: Story = {
  name: 'Одна модель',
  args: { products: singleModel },
};

export const Empty: Story = {
  name: 'Каталог пуст',
  args: { products: [] },
};

export const Discounted: Story = {
  name: 'Модель со скидкой',
  args: { products: discountedModels, now: saleNow },
};

export const WithoutStats: Story = {
  name: 'Без цифр и плашки',
  args: { stats: [], note: undefined },
};

export const WithWeather: Story = {
  name: 'С погодой в городе',
  args: { weather: { current: 27, max: 31 } },
};
