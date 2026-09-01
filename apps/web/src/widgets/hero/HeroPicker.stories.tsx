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
    <div
      /* 🔴 Витрина в три колонки уводила документ вбок на 320 и 375 (issue
         #472), и допущена была как «витрина по замыслу». Замысел — приёмка
         issue #256: кнопка стоит на одной линии во всех трёх состояниях. По
         колонке в 96px этого не видно: подбор рисуется обрезками, и линия
         кнопки не сходится не потому, что дефект, а потому, что карточке не
         хватило места. Витрина, показывающая искалеченное, ничего не
         принимает.

         300px — ширина, на которой подбор рисуется целиком; ниже состояния
         встают друг под друга и сравниваются прокруткой. */
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        padding: 16,
      }}
    >
      <HeroPicker {...args} products={heroPickerModels} />
      <HeroPicker {...args} products={heroPickerModels} pending />
      <HeroPicker {...args} products={weakPickerModels} />
    </div>
  ),
};
