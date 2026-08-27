import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StockFilters } from './StockFilters';
import { stockManagerContent as texts } from './content';
import { overview } from './fixtures';

const base = {
  filters: { query: '', group: '', low: false, archived: false },
  groups: overview.groups,
  total: 4,
};

describe('Фильтр остатков', () => {
  it('группы приходят из справочника, а не из кода', () => {
    render(<StockFilters {...base} />);

    for (const group of overview.groups) {
      expect(screen.getByRole('link', { name: group })).toBeVisible();
    }
    expect(screen.getByRole('link', { name: texts.groupAll })).toBeVisible();
  });

  it('🔴 выбор группы сохраняет поиск: фильтр живёт в адресе целиком', () => {
    render(
      <StockFilters
        {...base}
        filters={{ query: 'труба', group: '', low: true, archived: false }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Крепёж' })).toHaveAttribute(
      'href',
      '/admin/stock?q=%D1%82%D1%80%D1%83%D0%B1%D0%B0&group=%D0%9A%D1%80%D0%B5%D0%BF%D1%91%D0%B6&low=1',
    );
  });

  it('умолчания в адрес не уезжают: чистый адрес остаётся чистым', () => {
    render(
      <StockFilters
        {...base}
        filters={{ query: '', group: 'Крепёж', low: true, archived: false }}
      />,
    );

    expect(screen.getByRole('link', { name: texts.groupAll })).toHaveAttribute(
      'href',
      '/admin/stock?low=1',
    );
    expect(screen.getByRole('link', { name: texts.lowAll })).toHaveAttribute(
      'href',
      '/admin/stock?group=%D0%9A%D1%80%D0%B5%D0%BF%D1%91%D0%B6',
    );
  });

  it('выбранный фильтр помечен для скринридера, а не только цветом', () => {
    render(
      <StockFilters
        {...base}
        filters={{ query: '', group: 'Крепёж', low: false, archived: false }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Крепёж' })).toHaveAttribute('aria-current', 'page');
  });

  it('🔴 поиск без JS уносит выбранную группу скрытыми полями формы', () => {
    const { container } = render(
      <StockFilters
        {...base}
        filters={{ query: '', group: 'Крепёж', low: true, archived: false }}
      />,
    );

    const form = container.querySelector('form');
    expect(form).toHaveAttribute('action', '/admin/stock');
    expect(form).toHaveAttribute('method', 'get');
    expect(container.querySelector('input[name="group"]')).toHaveValue('Крепёж');
    expect(container.querySelector('input[name="low"]')).toHaveValue('1');
  });

  it('без фильтров сбрасывать нечего', () => {
    render(<StockFilters {...base} />);

    expect(screen.queryByRole('link', { name: texts.searchReset })).not.toBeInTheDocument();
  });

  it('счётчик закупки виден владельцу и молчит, когда ключа нет', () => {
    const { rerender } = render(<StockFilters {...base} lowCount={2} />);
    expect(screen.getByText(texts.lowCount(2))).toBeVisible();

    rerender(<StockFilters {...base} />);
    expect(screen.queryByText(texts.lowCount(2))).not.toBeInTheDocument();
  });
});
