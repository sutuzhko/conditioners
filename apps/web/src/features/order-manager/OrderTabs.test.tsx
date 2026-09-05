import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ORDER_TAB_TITLE, orderManagerContent as texts } from './content';
import { OrderTabs } from './OrderTabs';

/** Разбирает `href` вкладки в набор параметров — порядок ключей неважен. */
function paramsOf(name: string): URLSearchParams {
  const href = screen.getByRole('link', { name }).getAttribute('href') ?? '';
  return new URL(href, 'https://example.test').searchParams;
}

describe('Стопки заказов', () => {
  it('пять стопок словаря', () => {
    render(<OrderTabs tab="active" period="all" query="" />);

    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByRole('navigation')).toHaveAccessibleName(texts.tabsLabel);
  });

  it('🔴 в адресе стоит ключ макета `declined`, а не доменный статус', () => {
    render(<OrderTabs tab="active" period="all" query="" />);

    expect(paramsOf(ORDER_TAB_TITLE.cancelled).get('tab')).toBe('declined');
  });

  it('период и поиск переезжают вместе со стопкой', () => {
    render(<OrderTabs tab="active" period="month" query="Соколова" />);

    const params = paramsOf(ORDER_TAB_TITLE.history);

    expect(params.get('period')).toBe('month');
    expect(params.get('q')).toBe('Соколова');
  });

  it('умолчания в адрес не уезжают: ссылка на «Активные» чистая', () => {
    render(<OrderTabs tab="history" period="all" query="" />);

    expect(screen.getByRole('link', { name: ORDER_TAB_TITLE.active })).toHaveAttribute(
      'href',
      '/admin/orders',
    );
  });

  it('🔴 счётчик вкладки объявляется словами, а не голым числом', () => {
    render(
      <OrderTabs tab="active" period="all" query="" counts={{ active: 7, new: 2, all: 24 }} />,
    );

    /* На экране «7», для озвучки — «Активные: 7 нарядов»: число без пояснения
       читалка объявляет как «Активные семь», и это не значит ничего. */
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(texts.tabCount(ORDER_TAB_TITLE.active, 7))).toBeInTheDocument();

    /* У закрытых стопок счётчика нет: «сколько накопилось за всё время» —
       число, которое растёт само и ни к чему не зовёт. */
    expect(screen.queryByText(texts.tabCount(ORDER_TAB_TITLE.history, 0))).not.toBeInTheDocument();
  });

  it('открытая стопка отмечена для скринридера, а не только цветом', () => {
    render(<OrderTabs tab="history" period="all" query="" />);

    expect(screen.getByRole('link', { name: ORDER_TAB_TITLE.history })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: ORDER_TAB_TITLE.all })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
