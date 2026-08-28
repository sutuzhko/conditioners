import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ProductDetails } from './ProductDetails';
import {
  catalogFixture,
  discountedProduct,
  expiredSaleProduct,
  galleryProduct,
  labelledSaleProduct,
  NOW,
  plainProduct,
  productHrefFixture,
  specDictionaryFixture,
  uniqueSpecProduct,
} from './fixtures';
import { similarProducts } from './model';

const meta = {
  title: 'Блоки/Страница модели',
  component: ProductDetails,
  args: {
    product: discountedProduct,
    catalogHref: '/catalog',
    compareHref: { pathname: '/catalog', query: { compare: 'split-09' }, hash: 'compare' },
    similar: similarProducts(catalogFixture, discountedProduct),
    productHref: productHrefFixture,
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

export const WithoutSimilar: Story = {
  name: 'Похожих моделей нет',
  args: { similar: [] },
};

export const WithoutCompare: Story = {
  name: 'Без отметки сравнения',
  args: { compareHref: undefined },
};
