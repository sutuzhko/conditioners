import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Hero } from './Hero';
import { HeroPicker } from './HeroPicker';
import {
  discountedPickerModels,
  heroPickerModels,
  heroStats,
  heroStatsFour,
  longNote,
  saleNow,
  singlePickerModel,
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
    products: heroPickerModels,
    stats: heroStats,
    note: 'Работаем по всей Туле и области',
  },
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Несколько моделей' };

export const Single: Story = {
  name: 'Одна модель',
  args: { products: singlePickerModel },
};

export const Empty: Story = {
  name: 'Каталог пуст',
  args: { products: [] },
};

export const Discounted: Story = {
  name: 'Модель со скидкой',
  args: { products: discountedPickerModels, now: saleNow },
};

/**
 * 🔴 Снимок этой истории — приёмка ADR-126: обе карточки обязаны быть одной
 * высоты. Слева модель со скидкой, справа она же без неё; площадь по
 * умолчанию у обеих одна, значит имена и характеристики совпадают и разницу
 * даёт только блок цены.
 */
export const PriceReserve: Story = {
  name: 'Подбор: со скидкой и без — рядом',
  // Допущение инвариантов — причина в reason (ADR-230)
  parameters: {
    invariants: {
      allow: [{ rule: 'overflow-x', reason: 'issue #472 — документ 326px на ширине 320' }],
    },
  },
  render: (args) => (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr', padding: 20 }}>
      <HeroPicker products={discountedPickerModels} leadHref="#lead" now={saleNow} />
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
  args: { weather: { mean: 27, max: 31 } },
};

export const WeatherCold: Story = {
  name: 'Погода до сезона',
  args: { weather: { mean: 8, max: 12 } },
};

/**
 * 🔴 Оффер телефона (issue #253, #254): один призыв, каталог текстовой
 * ссылкой, чип погоды в строку, показатели рядом из трёх. Ширина здесь —
 * часть состояния, поэтому история задаёт её глобалью: медиа-запрос смотрит
 * на окно, а не на контейнер.
 */
export const Phone: Story = {
  name: 'Телефон 375 — один призыв',
  globals: { viewport: { value: 'sm' } },
  args: { weather: { mean: 15, max: 34 } },
};

/** Нижняя граница поддержки: ряд из трёх цифр обязан остаться рядом. */
export const Narrow: Story = {
  name: 'Минимум 320 — ряд из трёх',
  globals: { viewport: { value: 'xs' } },
  args: { weather: { mean: 15, max: 34 } },
};
