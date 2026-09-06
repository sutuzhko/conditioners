import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StockJournalFilters } from './StockJournalFilters';
import { DEFAULT_STOCK_JOURNAL_FILTERS, STOCK_PATH } from './model';

const meta = {
  title: 'Админка/Склад · Отбор журнала',
  component: StockJournalFilters,
  args: {
    filters: DEFAULT_STOCK_JOURNAL_FILTERS,
    basePath: STOCK_PATH,
    baseQuery: { tab: 'log' },
  },
} satisfies Meta<typeof StockJournalFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Отбора нет: журнал за всё время и по всем видам движения. */
export const Базовое: Story = {};

/** Выбран вид движения: «покажи только приходы» — обычный вопрос к журналу. */
export const ПоВиду: Story = {
  args: { filters: { kind: 'income', period: 'all', query: '' } },
};

/** Выбран период: «что было в этом месяце». */
export const ЗаМесяц: Story = {
  args: { filters: { kind: undefined, period: 'month', query: '' } },
};

/** Отбор целиком: вид, период и поиск вместе — и ссылка «Сбросить отбор». */
export const ОтборЦеликом: Story = {
  args: { filters: { kind: 'consume', period: 'prev', query: 'труба' } },
};
