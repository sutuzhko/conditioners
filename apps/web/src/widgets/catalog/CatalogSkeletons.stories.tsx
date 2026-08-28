import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CatalogCompareSkeleton } from './CatalogCompareSkeleton';
import { CatalogListSkeleton } from './CatalogListSkeleton';
import { ProductDetailsSkeleton } from './ProductDetailsSkeleton';

/**
 * Скелетоны перехода публичных маршрутов каталога: их рисует `loading.tsx`,
 * пока Next собирает страницу. Смотреть их иначе, чем здесь, нельзя — на
 * стенде они живут доли секунды.
 */
const meta = {
  title: 'Блоки/Каталог — скелетоны',
  component: CatalogListSkeleton,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CatalogListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = { name: 'Каталог' };

export const Details: Story = {
  name: 'Страница модели',
  render: () => <ProductDetailsSkeleton />,
};

export const Compare: Story = {
  name: 'Сравнение',
  render: () => <CatalogCompareSkeleton />,
};
