import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {
  CATALOG_PAGE_SIZE,
  catalogFacets,
  parseCatalogQuery,
  selectCatalogPage,
} from '@/entities/product/lib/catalogQuery';

import { CatalogList, type CatalogListProps } from './CatalogList';
import {
  catalogFixture,
  expiredSaleProduct,
  NOW,
  plainProduct,
  productHrefFixture,
} from './fixtures';
import type { CatalogProduct } from './model';

/** Каталог целиком: шесть моделей, из которых складываются все состояния. */
const catalog: readonly CatalogProduct[] = [...catalogFixture, expiredSaleProduct];

/** Список ровно в две страницы: разбивку иначе не увидеть. */
const many: readonly CatalogProduct[] = Array.from(
  { length: CATALOG_PAGE_SIZE + 4 },
  (_, index) => ({
    ...plainProduct,
    id: `split-${index}`,
    slug: `split-${index}`,
    name: `Сплит-система ${String(index + 1).padStart(2, '0')}`,
    priceNum: 32_000 + index * 900,
    areaMax: 18 + index,
    sort: index,
  }),
);

/** Аргументы блока для заданного адреса: то же, что делает страница каталога. */
function argsFor(
  products: readonly CatalogProduct[],
  raw: Record<string, string> = {},
): CatalogListProps {
  const query = parseCatalogQuery(raw);

  return {
    page: selectCatalogPage(products, query, NOW),
    facets: catalogFacets(products),
    query,
    basePath: '/catalog',
    productHref: productHrefFixture,
    orderHref: '/#lead',
    now: NOW,
  };
}

const meta = {
  title: 'Блоки/Каталог — страница',
  component: CatalogList,
  args: argsFor(catalog),
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CatalogList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Весь каталог' };

export const Filtered: Story = {
  name: 'Выбран класс мощности',
  args: argsFor(catalog, { class: '09' }),
};

export const OnSale: Story = {
  name: 'Только со скидкой',
  args: argsFor(catalog, { sale: '1' }),
};

export const Sorted: Story = {
  name: 'Сначала дешевле',
  args: argsFor(catalog, { sort: 'price-asc' }),
};

export const SecondPage: Story = {
  name: 'Вторая страница',
  args: argsFor(many, { page: '2' }),
};

export const NothingFound: Story = {
  name: 'Под подбор ничего не нашлось',
  args: argsFor(catalog, { class: '09', area: '70' }),
};

export const Empty: Story = {
  name: 'Каталог пуст',
  args: argsFor([]),
};
