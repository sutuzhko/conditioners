import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { HeroPicker } from './HeroPicker';
import { discountedPickerModels, heroPickerModels, saleNow, weakPickerModels } from './fixtures';

/**
 * Карточка подбора первого экрана — главный инструмент страницы.
 *
 * 🔴 Три состояния результата обязаны быть одной высоты (issue #256): карточка
 * стоит в первом экране, и если она растёт и сжимается при каждом движении
 * ползунка, вместе с ней прыгает всё, что ниже. Проверяется это не снимком, а
 * координатой кнопки — снимок показывает одно состояние и на вопрос «двигается
 * ли кнопка» не отвечает вовсе (docs/CLAUDE.md, «Как проверяется сделанное»).
 */
const meta = {
  title: 'Блоки/Первый экран/Подбор',
  component: HeroPicker,
  parameters: { layout: 'padded' },
  args: {
    products: heroPickerModels,
    leadHref: '#lead',
    now: saleNow,
  },
} satisfies Meta<typeof HeroPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Found: Story = { name: 'Модель подобрана' };

export const Pending: Story = {
  name: 'Идёт пересчёт',
  args: { pending: true },
};

/**
 * Каталог закрывает площадь только до 20 м², а ползунок стоит на 25 — подобрать
 * нечего. Цены здесь нет и быть не может: смету на мульти-сплит считают по
 * месту, а показанное на сайте обязано совпасть с телефонным разговором.
 */
export const NoFit: Story = {
  name: 'Подходящей модели нет',
  args: { products: weakPickerModels },
};

export const Discounted: Story = {
  name: 'Модель со скидкой',
  args: { products: discountedPickerModels },
};

export const EmptyCatalog: Story = {
  name: 'Каталог пуст',
  args: { products: [] },
};

/**
 * 🔴 Приёмка issue #256 глазами: три состояния рядом на одной ширине. Кнопка
 * стоит на одной линии во всех трёх — это и есть то, что обязано сойтись.
 */
export const States: Story = {
  name: 'Три состояния рядом',
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr 1fr', padding: 16 }}>
      <HeroPicker {...args} products={heroPickerModels} />
      <HeroPicker {...args} products={heroPickerModels} pending />
      <HeroPicker {...args} products={weakPickerModels} />
    </div>
  ),
};
