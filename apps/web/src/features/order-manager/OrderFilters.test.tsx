import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderFilters } from './OrderFilters';
import { ORDER_PERIOD_TITLE, orderManagerContent as texts } from './content';
import { installers, listFilters } from './fixtures';

/** Разбирает `href` ссылки в набор параметров — порядок ключей неважен. */
function paramsOf(name: string | RegExp): URLSearchParams {
  const href = screen.getByRole('link', { name }).getAttribute('href') ?? '';
  return new URL(href, 'https://example.test').searchParams;
}

describe('Фильтр заказов', () => {
  it('🔴 стопка, период и поиск живут в адресе — ссылку можно прислать', () => {
    render(
      <OrderFilters
        filters={listFilters({ tab: 'cancelled', period: 'month', query: 'Соколова' })}
        total={2}
      />,
    );

    const params = paramsOf(ORDER_PERIOD_TITLE.prev);

    /* 🔴 В адресе стоит ключ макета `declined`, а не доменный статус
       `cancelled`: словарь вкладок описывает адрес (ADR-255). */
    expect(params.get('tab')).toBe('declined');
    expect(params.get('period')).toBe('prev');
    expect(params.get('q')).toBe('Соколова');
  });

  it('🔴 параметры адреса английские, без транслита', () => {
    render(<OrderFilters filters={listFilters()} total={4} />);

    const params = paramsOf(ORDER_PERIOD_TITLE.prev);

    expect([...params.keys()]).toEqual(['period']);
    expect(screen.getByLabelText(texts.searchLabel)).toHaveAttribute('name', 'q');
  });

  it('умолчания в адрес не уезжают: лишних параметров в ссылке нет', () => {
    render(<OrderFilters filters={listFilters({ period: 'prev' })} total={0} />);

    const href = screen.getByRole('link', { name: ORDER_PERIOD_TITLE.all }).getAttribute('href');

    expect(href).toBe('/admin/orders');
  });

  it('выбранный период отмечен для скринридера, а не только цветом', () => {
    render(<OrderFilters filters={listFilters({ tab: 'history', period: 'month' })} total={7} />);

    expect(screen.getByRole('link', { name: ORDER_PERIOD_TITLE.month })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: ORDER_PERIOD_TITLE.prev })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('🔴 применённое условие видно плашкой и снимается по одному', () => {
    render(
      <OrderFilters filters={listFilters({ period: 'month', query: 'Соколова' })} total={2} />,
    );

    /* Два условия — период и поиск: пилюля считает их числом, а каждая плашка
       уводит на адрес без своего условия. */
    expect(screen.getByText(texts.filterApplied(2))).toBeInTheDocument();

    const drop = screen.getByRole('link', {
      name: new RegExp(texts.filterDrop(ORDER_PERIOD_TITLE.month)),
    });
    const params = new URL(drop.getAttribute('href') ?? '', 'https://example.test').searchParams;

    expect(params.get('period')).toBeNull();
    expect(params.get('q')).toBe('Соколова');
  });

  it('без условий пилюля не считает ничего', () => {
    render(<OrderFilters filters={listFilters()} total={9} />);

    expect(screen.queryByText(texts.filterApplied(1))).not.toBeInTheDocument();
    expect(screen.getByText(texts.filterPill)).toBeInTheDocument();
  });

  it('поиск переносит выбранную стопку и период скрытыми полями', () => {
    render(<OrderFilters filters={listFilters({ tab: 'new', period: 'month' })} total={1} />);

    const form = screen.getByRole('search');
    expect(within(form).getByDisplayValue('new')).toHaveAttribute('name', 'tab');
    expect(within(form).getByDisplayValue('month')).toHaveAttribute('name', 'period');
  });

  it('🔴 скрытое поле поиска несёт ключ адреса, а не доменный статус', () => {
    render(<OrderFilters filters={listFilters({ tab: 'cancelled' })} total={3} />);

    const form = screen.getByRole('search');
    expect(within(form).getByDisplayValue('declined')).toHaveAttribute('name', 'tab');
  });

  it('🔴 фильтр по монтажнику становится третьим условием и снимается плашкой', () => {
    const person = installers[0];
    if (person === undefined) throw new Error('Фикстура монтажников пуста');

    render(
      <OrderFilters
        filters={listFilters({ installer: person.id })}
        installers={installers}
        total={4}
      />,
    );

    expect(screen.getByText(texts.filterApplied(1))).toBeInTheDocument();

    const drop = screen.getByRole('link', {
      name: new RegExp(texts.filterDrop(person.name ?? person.login)),
    });

    expect(drop.getAttribute('href')).toBe('/admin/orders');
  });

  it('🔴 «Не назначен» — такой же выбор фильтра, как имя монтажника', () => {
    render(<OrderFilters filters={listFilters()} installers={installers} total={9} />);

    const params = paramsOf(texts.installerNoneFilter);

    expect(params.get('installer')).toBe('none');
  });

  it('сортировка уходит в адрес и не считается условием фильтра', () => {
    render(<OrderFilters filters={listFilters({ sort: 'sum' })} total={9} />);

    /* Сортировка список не укорачивает — плашкой она не становится, и пилюля
       фильтра её не считает. */
    expect(screen.queryByText(texts.filterApplied(1))).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: texts.sortTitle.number }).getAttribute('href'),
    ).toContain('sort=number');
  });

  it('🔴 колонка переключается ссылкой в обе стороны', () => {
    const { unmount } = render(<OrderFilters filters={listFilters()} total={9} />);

    /* «Тип» на «Активных» спрятан по умолчанию: ссылка его включает. */
    const show = screen.getByRole('link', { name: texts.columnShow(texts.colType) });
    expect(show.getAttribute('href')).toContain('cols=type');
    unmount();

    render(<OrderFilters filters={listFilters({ columns: ['type'] })} total={9} />);

    const hide = screen.getByRole('link', { name: texts.columnHide(texts.colType) });
    expect(hide.getAttribute('href')).toBe('/admin/orders');
  });

  it('считает найденное отдельно от всего списка', () => {
    const { unmount } = render(<OrderFilters filters={listFilters({ tab: 'all' })} total={9} />);
    expect(screen.getByText(texts.totalCount(9))).toBeInTheDocument();
    unmount();

    render(<OrderFilters filters={listFilters({ tab: 'all', query: '1059' })} total={1} />);
    expect(screen.getByText(texts.found(1))).toBeInTheDocument();
  });
});
