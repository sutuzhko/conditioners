import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/* Подвал журнала зовёт `useRouter().push()` при смене шага листания
   (`shared/ui/PageSize`): без роутера история падает на самой отрисовке. */
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { StockJournal } from './StockJournal';
import { STOCK_MOVE_TITLES, stockManagerContent as texts } from './content';
import {
  authorlessMove,
  consumeMove,
  countMove,
  emptyJournal,
  incomeMove,
  journal,
  longJournal,
  transferMove,
} from './fixtures';
import { DEFAULT_STOCK_JOURNAL_FILTERS, STOCK_PATH, stockItemPath } from './model';

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

    /* Шаг в панели — шеврон, и имя ему даёт `aria-label` (issue #748). */
    expect(screen.getByRole('link', { name: 'Следующая страница' })).toHaveAttribute(
      'href',
      `${basePath}?page=3`,
    );
  });

  /**
   * 🔴 Шаг листания журнала — выбор владельца, а не константа репозитория
   * (issue #725). Пока его не было, журнал стоял на зашитых двадцати, тогда
   * как у остатков в том же разделе шаг уже переключался.
   */
  it('журнал даёт выбрать, сколько движений на странице', () => {
    render(<StockJournal journal={longJournal} basePath={basePath} />);

    const steps = screen.getByRole('combobox', { name: texts.perPage });
    expect(within(steps).getByRole('option', { name: '8' })).toHaveAttribute(
      'value',
      `${basePath}?size=8`,
    );
  });

  it('смена шага уносит с собой отбор и вкладку раздела, но не номер страницы', () => {
    render(
      <StockJournal
        journal={longJournal}
        basePath={STOCK_PATH}
        baseQuery={{ tab: 'log' }}
        withItem
        withFilter
        filters={{ ...DEFAULT_STOCK_JOURNAL_FILTERS, kind: 'income' }}
        size={8}
      />,
    );

    const steps = screen.getByRole('combobox', { name: texts.perPage });
    expect(within(steps).getByRole('option', { name: '50' })).toHaveAttribute(
      'value',
      `${STOCK_PATH}?tab=log&kind=income&size=50`,
    );
  });

  it('возврат к умолчанию снимает шаг из адреса, а не оставляет прежний', () => {
    render(<StockJournal journal={longJournal} basePath={basePath} size={8} />);

    const steps = screen.getByRole('combobox', { name: texts.perPage });
    expect(within(steps).getByRole('option', { name: '20' })).toHaveAttribute('value', basePath);
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

  /* ---------- Знак у количества и отбор (issue #610) ---------- */

  it('🔴 приход и списание в колонке «Сколько» больше не выглядят одинаково', () => {
    render(
      <StockJournal
        journal={{ ...journal, items: [incomeMove, consumeMove], total: 2 }}
        basePath={basePath}
      />,
    );

    expect(screen.getByText(/^\+50/u)).toBeVisible();
    expect(screen.getByText(/^−4/u)).toBeVisible();
  });

  it('🔴 у перемещения знака нет: общий остаток оно не меняет', () => {
    render(
      <StockJournal
        journal={{ ...journal, items: [transferMove], total: 1 }}
        basePath={basePath}
      />,
    );

    const row = screen.getByRole('row', { name: new RegExp(STOCK_MOVE_TITLES.transfer) });
    expect(within(row).getByText(/^15/u)).toBeVisible();
  });

  it('отбор по виду, периоду и поиску живёт в адресе', () => {
    render(
      <StockJournal
        journal={journal}
        basePath={STOCK_PATH}
        baseQuery={{ tab: 'log' }}
        withItem
        withFilter
        filters={DEFAULT_STOCK_JOURNAL_FILTERS}
      />,
    );

    expect(screen.getByRole('link', { name: STOCK_MOVE_TITLES.income })).toHaveAttribute(
      'href',
      '/admin/stock?tab=log&kind=income',
    );
    expect(screen.getByRole('link', { name: texts.journalPeriodTitle('month') })).toHaveAttribute(
      'href',
      '/admin/stock?tab=log&period=month',
    );
    expect(
      screen.getByRole('searchbox', { name: new RegExp(texts.journalSearchLabel) }),
    ).toBeVisible();
  });

  it('🔴 отбор переезжает в форму поиска: `GET` заменяет строку запроса целиком', () => {
    const { container } = render(
      <StockJournal
        journal={journal}
        basePath={STOCK_PATH}
        baseQuery={{ tab: 'log' }}
        withItem
        withFilter
        filters={{ kind: 'income', period: 'month', query: '' }}
      />,
    );

    const hidden = [...container.querySelectorAll('input[type="hidden"]')].map((input) => [
      input.getAttribute('name'),
      input.getAttribute('value'),
    ]);

    expect(hidden).toEqual([
      ['tab', 'log'],
      ['kind', 'income'],
      ['period', 'month'],
    ]);
  });

  it('пусто по отбору объясняется не так, как пусто вообще', () => {
    render(
      <StockJournal
        journal={emptyJournal}
        basePath={STOCK_PATH}
        baseQuery={{ tab: 'log' }}
        withItem
        withFilter
        filters={{ kind: 'income', period: 'all', query: '' }}
        emptyText={texts.journalAllEmpty}
      />,
    );

    expect(screen.getByText(texts.journalNothingText)).toBeVisible();
    expect(screen.queryByText(texts.journalAllEmpty)).not.toBeInTheDocument();
  });

  /* ---------- Выход из пустого отбора (issue #580) ---------- */

  it('🔴 из «ничего не нашлось» ведёт ссылка, и она сохраняет вкладку раздела', () => {
    render(
      <StockJournal
        journal={emptyJournal}
        basePath={STOCK_PATH}
        baseQuery={{ tab: 'log' }}
        withItem
        withFilter
        filters={{ kind: 'income', period: 'all', query: '' }}
        emptyText={texts.journalAllEmpty}
      />,
    );

    const reset = screen.getByRole('link', { name: texts.journalEmptyAction });
    const href = reset.getAttribute('href') ?? '';

    /* 🔴 Вкладка остаётся: адрес журнала без `tab` открывает остатки, и
       «сброс отбора» уводил бы человека из журнала вовсе (issue #352). */
    expect(href).toContain('tab=log');
    expect(href).not.toContain('kind=income');
  });

  it('🔴 у пустого журнала выхода нет: сбрасывать нечего, движений не было вовсе', () => {
    render(<StockJournal journal={emptyJournal} basePath={basePath} />);

    expect(screen.getByRole('heading', { name: texts.journalEmptyTitle })).toBeVisible();
    expect(screen.queryByRole('link', { name: texts.journalEmptyAction })).toBeNull();
  });
});
