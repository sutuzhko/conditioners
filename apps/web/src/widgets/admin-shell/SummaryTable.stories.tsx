import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Card } from '@/shared/ui';

import { filteredUpcoming, pagedUpcoming, upcomingItems } from './fixtures';
import { SummaryFilters } from './SummaryFilters';
import { SummaryTable } from './SummaryTable';
import { DEFAULT_UPCOMING_FILTERS } from './summary-list';

/**
 * «Ближайшие дела» отдельно от сводки (issue #591): состояния, которых на
 * готовом экране не увидеть, — выключенные колонки и пустой отбор.
 *
 * Ряд пилюль стоит над таблицей, как на «Обзоре»: они одно целое, и смотреть
 * на таблицу без её отбора значит смотреть на половину блока.
 */
const meta = {
  /* 🔴 Раздел `Админка/`, а не свой: списки разделов у снимков, инвариантов и
     измерений зашиты префиксами, и новый префикс не попал бы ни в одну работу. */
  title: 'Админка/Ближайшие дела',
  component: SummaryTable,
  parameters: { layout: 'padded' },
  args: {
    items: upcomingItems,
    filters: DEFAULT_UPCOMING_FILTERS,
    page: 1,
    pages: 1,
  },
  decorators: [
    (Story, context) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Card as="section" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SummaryFilters filters={context.args.filters} total={context.args.items.length} />
          <Story />
        </Card>
      </div>
    ),
  ],
} satisfies Meta<typeof SummaryTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Все колонки: когда, работа и объект, монтажник, статус, сумма, действия. */
export const Базовое: Story = { name: 'Все колонки' };

/**
 * Колонки выключены пилюлей «Колонки». «Когда» и «Работа» не выключаются
 * ни пилюлей, ни адресом: по ним строку опознают.
 */
export const БезКолонок: Story = {
  name: 'Колонки выключены',
  args: {
    filters: { ...DEFAULT_UPCOMING_FILTERS, hidden: ['installer', 'sum'] },
  },
};

/** Отбор применён и ничего не нашёл: объясняется, что снять. */
export const ПустойОтбор: Story = {
  name: 'Отбор ничего не нашёл',
  args: { items: [], filters: filteredUpcoming.filters, page: 1, pages: 1 },
};

/** Ни одной работы: пустой план объясняется иначе, чем пустой отбор. */
export const ПустойПлан: Story = {
  name: 'Ничего не запланировано',
  args: { items: [], filters: DEFAULT_UPCOMING_FILTERS, page: 1, pages: 1 },
};

/** Дел больше страницы: под таблицей появляется разбивка с полосой номеров. */
export const СРазбивкой: Story = {
  name: 'Несколько страниц',
  args: {
    items: pagedUpcoming.items,
    filters: pagedUpcoming.filters,
    page: pagedUpcoming.page,
    pages: pagedUpcoming.pages,
  },
};
