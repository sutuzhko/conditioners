import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ProductSaleForm } from './ProductSaleForm';
import {
  acceptingSave,
  activeSale,
  expiredSale,
  higherThanBase,
  nowFixture,
  priceFixture,
} from './fixtures';
import { emptySaleValues } from './model';

const meta = {
  title: 'Админка/Скидка на модель',
  component: ProductSaleForm,
  args: {
    priceNum: priceFixture,
    values: emptySaleValues,
    save: acceptingSave,
    now: nowFixture,
  },
} satisfies Meta<typeof ProductSaleForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Скидки нет — обычное состояние модели. */
export const БезСкидки: Story = {};

export const ДействующаяСкидка: Story = {
  args: { values: activeSale },
};

/** Период закончился: скидка снялась сама, без участия владельца. */
export const ПериодЗакончился: Story = {
  args: { values: expiredSale },
};

/** 🔴 Цена не ниже обычной — перечёркивать нечего, предупреждаем. */
export const ЦенаВышеОбычной: Story = {
  args: { values: higherThanBase },
};
