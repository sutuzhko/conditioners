import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderList } from './OrderList';
import { orderManagerContent as texts } from './content';
import { emptyPage, page } from './fixtures';

/** Момент отсчёта просрочки: без него снимок списка зависел бы от даты прогона. */
const NOW = '2026-08-20T09:00:00.000Z';

describe('Список нарядов', () => {
  it('рисует все наряды страницы строками таблицы', () => {
    render(<OrderList page={page} now={NOW} />);

    /* Строка шапки в счёт не идёт: в таблице она такая же `row`. */
    expect(screen.getAllByRole('row')).toHaveLength(page.items.length + 1);
  });

  it('🔴 у монтажника колонки суммы нет вовсе, а не прочерк в ней', () => {
    const { unmount } = render(<OrderList page={page} now={NOW} />);
    expect(screen.getByRole('columnheader', { name: texts.colSum })).toBeInTheDocument();
    unmount();

    render(<OrderList page={page} now={NOW} forInstaller />);
    expect(screen.queryByRole('columnheader', { name: texts.colSum })).not.toBeInTheDocument();
  });

  it('🔴 пустой список без фильтра зовёт завести первый наряд', () => {
    render(<OrderList page={emptyPage} />);

    expect(screen.getByText(texts.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.emptyText)).toBeInTheDocument();
  });

  it('🔴 пустой список по фильтру объясняется иначе: наряд в другой стопке', () => {
    render(<OrderList page={emptyPage} filters={{ tab: 'cancelled' }} />);

    expect(screen.getByText(texts.emptyFound)).toBeInTheDocument();
    expect(screen.queryByText(texts.emptyText)).not.toBeInTheDocument();
  });

  it('поиск без находок — тоже фильтр, а не пустая база', () => {
    render(<OrderList page={emptyPage} filters={{ query: '9999' }} />);

    expect(screen.getByText(texts.emptyFound)).toBeInTheDocument();
  });

  it('монтажнику пустота объясняется его словами', () => {
    render(<OrderList page={emptyPage} forInstaller />);

    expect(screen.getByText(texts.emptyInstaller)).toBeInTheDocument();
  });
});
