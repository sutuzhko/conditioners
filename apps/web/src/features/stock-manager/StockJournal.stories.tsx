import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StockJournal } from './StockJournal';
import { authorlessMove, countMove, emptyJournal, journal, longJournal } from './fixtures';
import { STOCK_JOURNAL_PATH, stockItemPath } from './model';

const basePath = stockItemPath('s1');

const meta = {
  title: 'Админка/Склад · Журнал движений',
  component: StockJournal,
  args: { journal, basePath },
} satisfies Meta<typeof StockJournal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Приход, перемещение, списание в наряд и инвентаризация — весь путь позиции. */
export const Базовое: Story = {};

/** Журнал длиннее страницы: появляется разбивка. */
export const СоСтраницами: Story = {
  args: { journal: longJournal },
};

/** Движений не было: остаток появится после первого прихода. */
export const Пусто: Story = {
  args: { journal: emptyJournal },
};

/** 🔴 Инвентаризация: поправка в минус и её основание. */
export const Инвентаризация: Story = {
  args: { journal: { ...journal, items: [countMove], total: 1 } },
};

/** Автор удалён: журнал переживает увольнение. */
export const БезАвтора: Story = {
  args: { journal: { ...journal, items: [authorlessMove], total: 1 } },
};

/**
 * 🔴 Журнал всего склада (ADR-137): к колонкам добавляется позиция — «что
 * двигали» первый вопрос к нему. История позиции при этом никуда не девается.
 */
export const ЖурналСклада: Story = {
  args: { basePath: STOCK_JOURNAL_PATH, withItem: true },
};
