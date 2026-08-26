import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Catalog } from './Catalog';
import {
  catalogFixture,
  discountedProduct,
  expiredSaleProduct,
  hiddenProduct,
  labelledSaleProduct,
  NOW,
  plainProduct,
  productHrefFixture,
  uniqueSpecProduct,
} from './fixtures';

const meta = {
  title: 'Блоки/Каталог',
  component: Catalog,
  args: {
    products: catalogFixture,
    now: NOW,
    productHref: productHrefFixture,
    catalogHref: '/catalog',
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Catalog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Витрина и сравнение' };

export const WithDiscount: Story = {
  name: 'Скидка: процент, старая цена, срок',
  args: { products: [discountedProduct] },
};

export const SaleWithLabel: Story = {
  name: 'Скидка с подписью владельца',
  args: { products: [labelledSaleProduct] },
};

export const ExpiredSale: Story = {
  name: 'Скидка закончилась — цена обычная',
  args: { products: [expiredSaleProduct] },
};

export const WithoutPhoto: Story = {
  name: 'Модель без фото',
  args: { products: [plainProduct] },
};

export const SingleProduct: Story = {
  name: 'Одна модель',
  args: { products: [uniqueSpecProduct] },
};

export const GrowingTable: Story = {
  name: 'Характеристика есть у одной модели',
  args: { products: [plainProduct, uniqueSpecProduct] },
};

export const HiddenFilteredOut: Story = {
  name: 'Скрытая модель не попадает ни в витрину, ни в сравнение',
  args: { products: [plainProduct, hiddenProduct] },
};

export const NoSpecs: Story = {
  name: 'Характеристик нет — сравнивать нечего',
  args: { products: [{ ...plainProduct, specs: [] }] },
};

export const Loading: Story = { name: 'Загрузка', args: { loading: true, products: [] } };

export const Empty: Story = { name: 'Пустой каталог', args: { products: [] } };
