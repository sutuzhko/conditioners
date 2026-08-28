import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Hero } from './Hero';
import { HeroPicker } from './HeroPicker';
import {
  discountedModels,
  heroModels,
  heroStats,
  heroStatsFour,
  longNote,
  saleNow,
  singleModel,
} from './fixtures';

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

/**
 * 🔴 Снимок этой истории — приёмка ADR-126: обе карточки обязаны быть одной
 * высоты. Слева модель со скидкой, справа она же без неё; площадь по
 * умолчанию у обеих одна, значит имена и характеристики совпадают и разницу
 * даёт только блок цены.
 */
export const PriceReserve: Story = {
  name: 'Подбор: со скидкой и без — рядом',
  render: (args) => (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr', padding: 20 }}>
      <HeroPicker products={discountedModels} leadHref="#lead" now={saleNow} />
      <HeroPicker products={args.products} leadHref="#lead" now={saleNow} />
    </div>
  ),
};

export const LongNote: Story = {
  name: 'Длинная плашка выезда',
  args: { note: longNote },
};

export const FourStats: Story = {
  name: 'Заведено четыре цифры — показаны три',
  args: { stats: heroStatsFour },
};

export const WithoutStats: Story = {
  name: 'Без цифр и плашки',
  args: { stats: [], note: undefined },
};

export const WithWeather: Story = {
  name: 'С погодой в городе',
  args: { weather: { mean: 27, max: 31 }, city: 'Тула' },
};

export const WeatherCold: Story = {
  name: 'Погода до сезона',
  args: { weather: { mean: 8, max: 12 }, city: 'Тула' },
};
