import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Pricing } from './Pricing';
import { customRates, priceRows, rates, singleRow } from './fixtures';

const meta = {
  title: 'Блоки/Цены',
  component: Pricing,
  args: { prices: priceRows, rates },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Pricing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Прайс и калькулятор' };

export const CustomEstimate: Story = {
  name: 'Расчёт: длинная трасса, высотный этаж, штробление, три блока',
  args: {
    calcDefaults: { cls: '18', trassaM: 12, floor: 12, shtroblenie: true, qty: 3 },
  },
};

export const OtherRates: Story = {
  name: 'Другие условия сметы: пять метров в базе, порог шестого этажа',
  args: { rates: customRates },
};

export const WithoutRates: Story = {
  name: 'Ставки не заданы — калькулятора нет',
  args: { rates: null },
};

export const SingleClass: Story = {
  name: 'Один класс мощности',
  args: { prices: singleRow },
};

export const Empty: Story = {
  name: 'Прайс не заполнен',
  args: { prices: [] },
};

export const EmptyWithoutRates: Story = {
  name: 'Ни прайса, ни ставок',
  args: { prices: [], rates: null },
};
