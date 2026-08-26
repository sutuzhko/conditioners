import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {
  parseCatalogQuery,
  selectCatalogCompare,
  type CatalogQuery,
} from '@/entities/product/lib/catalogQuery';

import { catalogFixture, expiredSaleProduct, NOW, specDictionaryFixture } from '../fixtures';
import type { CatalogProduct } from '../model';
import { CatalogCompare, type CatalogCompareProps } from './CatalogCompare';

/** Каталог целиком: из него истории и отмечают то одну модель, то все. */
const catalog: readonly CatalogProduct[] = [...catalogFixture, expiredSaleProduct];

/** Секция в том виде, в каком её собирает страница по заданному адресу. */
function argsFor(raw: Record<string, string> = {}): CatalogCompareProps {
  const query: CatalogQuery = parseCatalogQuery(raw);

  return {
    products: selectCatalogCompare(catalog, query.compare),
    query,
    basePath: '/catalog',
    now: NOW,
    specDictionary: specDictionaryFixture,
  };
}

const meta = {
  title: 'Блоки/Каталог — сравнение',
  component: CatalogCompare,
  args: argsFor({ compare: 'split-07,split-12' }),
  parameters: { layout: 'padded' },
} satisfies Meta<typeof CatalogCompare>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Two: Story = { name: 'Отмечены две модели' };

export const Empty: Story = {
  name: 'Ничего не отмечено',
  args: argsFor(),
};

export const Single: Story = {
  name: 'Отмечена одна — сравнивать не с чем',
  args: argsFor({ compare: 'split-07' }),
};

export const All: Story = {
  name: 'Отмечены все — колонки уходят в прокрутку',
  args: argsFor({ compare: catalog.map((product) => product.slug).join(',') }),
};

export const Reordered: Story = {
  name: 'Порядок колонок — порядок адреса',
  args: argsFor({ compare: 'split-12,split-07' }),
};

export const WithoutDictionary: Story = {
  name: 'Справочник не заполнен — строки без групп',
  args: { ...argsFor({ compare: 'split-07,split-12' }), specDictionary: undefined },
};

export const WithoutSpecs: Story = {
  name: 'Характеристик нет — остаётся цена',
  args: {
    ...argsFor({ compare: 'split-07,split-12' }),
    products: selectCatalogCompare(
      catalog.map((product) => ({ ...product, specs: [] })),
      ['split-07', 'split-12'],
    ),
  },
};
