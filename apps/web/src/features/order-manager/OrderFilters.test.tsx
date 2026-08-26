import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderFilters } from './OrderFilters';
import { ORDER_PERIOD_TITLE, ORDER_TAB_TITLE, orderManagerContent as texts } from './content';

/** Разбирает `href` ссылки в набор параметров — порядок ключей неважен. */
function paramsOf(name: string | RegExp): URLSearchParams {
  const href = screen.getByRole('link', { name }).getAttribute('href') ?? '';
  return new URL(href, 'https://example.test').searchParams;
}

describe('Фильтр заказов', () => {
  it('🔴 стопка, период и поиск живут в адресе — ссылку можно прислать', () => {
    render(<OrderFilters tab="active" period="month" query="Соколова" total={2} />);

    const params = paramsOf(ORDER_TAB_TITLE.cancelled);

    expect(params.get('tab')).toBe('cancelled');
    expect(params.get('period')).toBe('month');
    expect(params.get('q')).toBe('Соколова');
  });

  it('🔴 параметры адреса английские, без транслита', () => {
    render(<OrderFilters tab="active" period="all" query="" total={4} />);

    const params = paramsOf(ORDER_PERIOD_TITLE.prev);

    expect([...params.keys()]).toEqual(['period']);
    expect(screen.getByLabelText(texts.searchLabel)).toHaveAttribute('name', 'q');
  });

  it('умолчания в адрес не уезжают: лишних параметров в ссылке нет', () => {
    render(<OrderFilters tab="cancelled" period="prev" query="" total={0} />);

    const href = screen.getByRole('link', { name: ORDER_TAB_TITLE.active }).getAttribute('href');

    expect(href).toBe('/admin/orders?period=prev');
  });

  it('выбранная стопка отмечена для скринридера, а не только цветом', () => {
    render(<OrderFilters tab="history" period="all" query="" total={7} />);

    expect(screen.getByRole('link', { name: ORDER_TAB_TITLE.history })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: ORDER_TAB_TITLE.all })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('поиск переносит выбранную стопку и период скрытыми полями', () => {
    render(<OrderFilters tab="new" period="month" query="" total={1} />);

    const form = screen.getByRole('search');
    expect(within(form).getByDisplayValue('new')).toHaveAttribute('name', 'tab');
    expect(within(form).getByDisplayValue('month')).toHaveAttribute('name', 'period');
  });

  it('сброс появляется только там, где есть что сбрасывать', () => {
    const { unmount } = render(<OrderFilters tab="active" period="all" query="" total={9} />);

    expect(screen.queryByRole('link', { name: texts.searchReset })).not.toBeInTheDocument();
    unmount();

    render(<OrderFilters tab="active" period="all" query="1059" total={1} />);
    expect(screen.getByRole('link', { name: texts.searchReset })).toHaveAttribute(
      'href',
      '/admin/orders',
    );
  });

  it('считает найденное отдельно от всего списка', () => {
    const { unmount } = render(<OrderFilters tab="all" period="all" query="" total={9} />);
    expect(screen.getByText(texts.totalCount(9))).toBeInTheDocument();
    unmount();

    render(<OrderFilters tab="all" period="all" query="1059" total={1} />);
    expect(screen.getByText(texts.found(1))).toBeInTheDocument();
  });
});
