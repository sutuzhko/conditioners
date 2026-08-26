import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ProductDetails } from './ProductDetails';
import {
  discountedProduct,
  expiredSaleProduct,
  galleryProduct,
  labelledSaleProduct,
  NOW,
  plainProduct,
  specDictionaryFixture,
  uniqueSpecProduct,
} from './fixtures';

const meta = {
  title: 'Блоки/Страница модели',
  component: ProductDetails,
  args: {
    product: discountedProduct,
    orderHref: '/#lead',
    catalogHref: '/catalog',
    now: NOW,
    specDictionary: specDictionaryFixture,
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProductDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Модель со скидкой и фото' };

export const WithoutPhoto: Story = {
  name: 'Без фотографий',
  args: { product: plainProduct },
};

export const SaleWithLabel: Story = {
  name: 'Скидка с подписью владельца',
  args: { product: labelledSaleProduct },
};

export const ExpiredSale: Story = {
  name: 'Скидка закончилась — цена обычная',
  args: { product: expiredSaleProduct },
};

export const SupplierLink: Story = {
  name: 'Со ссылкой к поставщику',
  args: { product: uniqueSpecProduct },
};

export const WithoutSpecs: Story = {
  name: 'Характеристики не заполнены',
  args: { product: { ...plainProduct, specs: [] } },
};

export const ManyPhotos: Story = {
  name: 'Несколько фотографий',
  args: { product: galleryProduct },
};
