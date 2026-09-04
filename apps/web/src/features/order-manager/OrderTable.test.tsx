import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ORDER_STATUS_TITLE, orderManagerContent as texts } from './content';
import { OrderTable } from './OrderTable';
import { cancelledOrder, freshOrder, installerOrder, order } from './fixtures';

/** До выезда наряда `order` (28 августа) — просроченного в списке нет. */
const BEFORE = '2026-08-27T09:00:00.000Z';
/** После него — наряд просрочен, потому что работа не закончена. */
const AFTER = '2026-08-30T09:00:00.000Z';

/** Строка наряда по его номеру: шапка в выборку не попадает. */
function rowOf(number: number): HTMLElement {
  const cell = screen.getByRole('link', { name: texts.rowOpen(number) });
  const row = cell.closest('tr');
  if (row === null) throw new Error(`Строка наряда № ${number} не найдена`);
  return row;
}

describe('Таблица нарядов', () => {
  it('колонки макета стоят в заданном порядке', () => {
    render(<OrderTable items={[order]} now={BEFORE} />);

    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      texts.colWhen,
      texts.colWork,
      texts.colInstaller,
      texts.colStatus,
      texts.colSum,
      texts.colActions,
    ]);
  });

  it('🔴 три действия строки подписаны по-разному, а не тремя одинаковыми значками', () => {
    render(<OrderTable items={[order]} now={BEFORE} />);

    const actions = screen.getByRole('group', { name: texts.rowActions(order.number) });

    expect(
      within(actions).getByRole('link', { name: texts.rowOpen(order.number) }),
    ).toHaveAttribute('href', `/admin/orders/${order.id}`);
    expect(
      within(actions).getByRole('link', { name: texts.rowCall(order.client.name) }),
    ).toHaveAttribute('href', `tel:${order.client.phone.replace(/[^\d+]/g, '')}`);
    expect(
      within(actions).getByRole('link', { name: texts.rowChecklist(order.number) }),
    ).toHaveAttribute('href', `/admin/orders/${order.id}?tab=checklist`);
  });

  it('🔴 просроченным считается наряд, по которому время прошло, а работа не закончена', () => {
    render(<OrderTable items={[order, cancelledOrder]} now={AFTER} />);

    expect(within(rowOf(order.number)).getByText(texts.overdueMark)).toBeInTheDocument();
    /* Отказ просроченным не бывает: по нему уже не поедут. */
    expect(
      within(rowOf(cancelledOrder.number)).queryByText(texts.overdueMark),
    ).not.toBeInTheDocument();
  });

  it('до срока отметки просрочки нет ни у одного наряда', () => {
    render(<OrderTable items={[order, freshOrder]} now={BEFORE} />);

    expect(screen.queryByText(texts.overdueMark)).not.toBeInTheDocument();
  });

  it('🔴 просрочка не подменяет статус: словарь статусов от неё не растёт', () => {
    render(<OrderTable items={[order]} now={AFTER} />);

    expect(within(rowOf(order.number)).getByText(ORDER_STATUS_TITLE.assigned)).toBeInTheDocument();
  });

  it('🔴 монтажнику суммы не показывают: колонки нет вовсе', () => {
    render(<OrderTable items={[installerOrder]} now={BEFORE} forInstaller />);

    expect(screen.queryByRole('columnheader', { name: texts.colSum })).not.toBeInTheDocument();
    expect(screen.queryByText(texts.money(installerOrder.price ?? 0))).not.toBeInTheDocument();
  });

  it('наряд без исполнителя говорит об этом словом, а не пустой ячейкой', () => {
    render(<OrderTable items={[freshOrder]} now={BEFORE} />);

    expect(
      within(rowOf(freshOrder.number)).getAllByText(texts.installerNone).length,
    ).toBeGreaterThan(0);
  });

  it('строка ведёт в карточку номером наряда', () => {
    render(<OrderTable items={[order]} now={BEFORE} />);

    expect(screen.getByRole('link', { name: texts.number(order.number) })).toHaveAttribute(
      'href',
      `/admin/orders/${order.id}`,
    );
  });
});
