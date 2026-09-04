import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StockJournal } from './StockJournal';
import { STOCK_MOVE_TITLES, stockManagerContent as texts } from './content';
import {
  authorlessMove,
  consumeMove,
  countMove,
  emptyJournal,
  journal,
  longJournal,
} from './fixtures';
import { STOCK_PATH, stockItemPath } from './model';

const basePath = stockItemPath('s1');

describe('Журнал движений', () => {
  it('показывает, что, куда, сколько, кто и когда', () => {
    render(<StockJournal journal={journal} basePath={basePath} />);

    expect(screen.getByText(STOCK_MOVE_TITLES.income)).toBeVisible();
    expect(screen.getByText(texts.moment(consumeMove.createdAt))).toBeVisible();
    expect(screen.getByText('Дмитрий Соколов')).toBeVisible();
  });

  it('списание в наряд ведёт в сам наряд', () => {
    render(<StockJournal journal={journal} basePath={basePath} />);

    expect(
      screen.getByRole('link', { name: texts.order(consumeMove.order?.number ?? 0) }),
    ).toHaveAttribute('href', '/admin/orders/o1');
  });

  it('🔴 поправка инвентаризации показывается со знаком и с основанием', () => {
    render(
      <StockJournal journal={{ ...journal, items: [countMove], total: 1 }} basePath={basePath} />,
    );

    const row = screen.getByRole('row', { name: new RegExp(STOCK_MOVE_TITLES.count) });
    expect(within(row).getByText(/−2,5/)).toBeVisible();
    expect(within(row).getByText(countMove.reason ?? '')).toBeVisible();
  });

  it('удалённый автор не ломает журнал', () => {
    render(
      <StockJournal
        journal={{ ...journal, items: [authorlessMove], total: 1 }}
        basePath={basePath}
      />,
    );

    expect(screen.getByText(texts.authorGone)).toBeVisible();
  });

  it('🔴 каждая ячейка подписана: на телефоне таблица раскладывается карточками', () => {
    render(
      <StockJournal journal={{ ...journal, items: [countMove], total: 1 }} basePath={basePath} />,
    );

    const row = screen.getByRole('row', { name: new RegExp(STOCK_MOVE_TITLES.count) });
    for (const cell of within(row).getAllByRole('cell')) {
      expect(cell).toHaveAttribute('data-label');
    }
  });

  it('журнал длиннее страницы листается ссылками', () => {
    render(<StockJournal journal={longJournal} basePath={basePath} />);

    expect(screen.getByRole('link', { name: /Дальше/ })).toHaveAttribute(
      'href',
      `${basePath}?page=3`,
    );
  });

  it('🔴 журнал всего склада называет позицию: «что двигали» — первый вопрос к нему', () => {
    render(<StockJournal journal={journal} basePath={STOCK_PATH} withItem />);

    expect(screen.getByRole('columnheader', { name: texts.colItem })).toBeVisible();
    expect(screen.getAllByRole('link', { name: consumeMove.item.name })[0]).toHaveAttribute(
      'href',
      `/admin/stock/items/${consumeMove.item.id}`,
    );
  });

  it('в карточке позиции колонки позиции нет: она там ничего не сообщает', () => {
    render(<StockJournal journal={journal} basePath={basePath} />);

    expect(screen.queryByRole('columnheader', { name: texts.colItem })).not.toBeInTheDocument();
  });

  it('пустой журнал склада объясняется своими словами, а не словами позиции', () => {
    render(
      <StockJournal
        journal={emptyJournal}
        basePath={STOCK_PATH}
        withItem
        emptyText={texts.journalAllEmpty}
      />,
    );

    expect(screen.getByText(texts.journalAllEmpty)).toBeVisible();
  });

  it('движений не было — объясняем, а не показываем пустую таблицу', () => {
    render(<StockJournal journal={emptyJournal} basePath={basePath} />);

    expect(screen.getByText(texts.journalEmpty)).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
