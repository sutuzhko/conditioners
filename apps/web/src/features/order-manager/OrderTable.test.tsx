import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/* 🔴 Строка зовёт `useRouter().refresh()` после удаления и возврата в работу:
   список, счётчики вкладок и строка счёта считаются на сервере, и обновлять
   их по одному на клиенте значит завести четыре источника правды об одном
   числе. В тесте роутера нет — подменяем его, как в опасной зоне монтажника. */
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { visibleColumns } from './columns';
import {
  ORDER_CANCEL_REASON_TITLE,
  ORDER_STATUS_TITLE,
  orderManagerContent as texts,
} from './content';
import { OrderTable } from './OrderTable';
import {
  cancelledOrder,
  declinedOrder,
  doneOrder,
  freshOrder,
  installerOrder,
  order,
} from './fixtures';

/** До выезда наряда `order` (28 августа) — просроченного в списке нет. */
const BEFORE = '2026-08-27T09:00:00.000Z';
/** После него — наряд просрочен, потому что работа не закончена. */
const AFTER = '2026-08-30T09:00:00.000Z';

/** Умолчание вкладки «Активные» — им открывается раздел. */
const ACTIVE = visibleColumns('active');

/** Строка наряда по его номеру: шапка в выборку не попадает. */
function rowOf(number: number): HTMLElement {
  const cell = screen.getByRole('link', { name: texts.rowOpen(number) });
  const row = cell.closest('tr');
  if (row === null) throw new Error(`Строка наряда № ${number} не найдена`);
  return row;
}

/** Подписи колонок в порядке показа. Скрытые от глаз имена сюда попадают. */
function headers(): readonly string[] {
  return screen.getAllByRole('columnheader').map((cell) => cell.textContent ?? '');
}

describe('Таблица нарядов', () => {
  it('колонки макета стоят в заданном порядке', () => {
    render(<OrderTable items={[order]} columns={ACTIVE} now={BEFORE} />);

    expect(headers()).toEqual([
      texts.colNumber,
      texts.colWork,
      texts.colInstaller,
      texts.colWhen,
      texts.colStatus,
      texts.colSum,
      texts.colActions,
    ]);
  });

  it('🔴 вкладка «Новые» получает свои колонки и своё действие строки', () => {
    render(
      <OrderTable
        items={[freshOrder]}
        columns={visibleColumns('new')}
        rowAction="assign"
        now={BEFORE}
      />,
    );

    expect(headers()).toContain(texts.colSource);
    expect(headers()).toContain(texts.colCreated);
    /* Ни «Когда», ни «Статус»: у наряда без исполнителя ни того ни другого
       ещё нет, и колонка из прочерков ничего не сообщает. */
    expect(headers()).not.toContain(texts.colWhen);

    expect(
      screen.getByRole('link', { name: texts.assignRowLabel(freshOrder.number) }),
    ).toHaveAttribute('href', `/admin/orders/${freshOrder.id}`);
  });

  it('🔴 вкладка «Отказы» показывает дату отказа и причину из справочника', () => {
    render(
      <OrderTable
        items={[cancelledOrder, declinedOrder]}
        columns={visibleColumns('cancelled')}
        rowAction="restore"
        now={BEFORE}
      />,
    );

    expect(headers()).toContain(texts.colDeclined);
    expect(headers()).toContain(texts.colReason);

    const row = rowOf(cancelledOrder.number);
    /* Справочник обобщает воронку, дописанное словами объясняет частный
       случай: в строке видно и то и другое (ADR-310). */
    expect(within(row).getByText(ORDER_CANCEL_REASON_TITLE.too_expensive)).toBeInTheDocument();
    expect(within(row).getByText(cancelledOrder.cancelNote ?? '')).toBeInTheDocument();

    /* Отказ без уточнения показывает только справочник — и не пустую ячейку. */
    expect(
      within(rowOf(declinedOrder.number)).getByText(ORDER_CANCEL_REASON_TITLE.no_answer),
    ).toBeInTheDocument();
  });

  it('вкладка «История» показывает день закрытия, а не день выезда', () => {
    render(<OrderTable items={[doneOrder]} columns={visibleColumns('history')} now={BEFORE} />);

    expect(headers()).toContain(texts.colClosed);
    expect(
      within(rowOf(doneOrder.number)).getByText(texts.date(doneOrder.resultAt ?? '')),
    ).toBeInTheDocument();
  });

  it('🔴 три действия строки подписаны по-разному, а не тремя одинаковыми значками', () => {
    render(<OrderTable items={[order]} columns={ACTIVE} now={BEFORE} />);

    const actions = screen.getByRole('group', { name: texts.rowActions(order.number) });

    expect(
      within(actions).getByRole('link', { name: texts.rowOpen(order.number) }),
    ).toHaveAttribute('href', `/admin/orders/${order.id}`);
    expect(
      within(actions).getByRole('link', { name: texts.rowCall(order.client.name) }),
    ).toHaveAttribute('href', `tel:${order.client.phone.replace(/[^\d+]/g, '')}`);
    expect(
      within(actions).getByRole('button', { name: texts.rowRemove(order.number) }),
    ).toBeInTheDocument();
  });

  it('🔴 удаление наряда монтажнику не показывается: это решение владельца', () => {
    render(
      <OrderTable
        items={[installerOrder]}
        columns={visibleColumns('active')}
        forInstaller
        now={BEFORE}
      />,
    );

    expect(
      screen.queryByRole('button', { name: texts.rowRemove(installerOrder.number) }),
    ).not.toBeInTheDocument();
  });

  it('🔴 просроченным считается наряд, по которому время прошло, а работа не закончена', () => {
    render(<OrderTable items={[order, cancelledOrder]} columns={ACTIVE} now={AFTER} />);

    expect(within(rowOf(order.number)).getByText(texts.overdueMark)).toBeInTheDocument();
    /* Отказ просроченным не бывает: по нему уже не поедут. */
    expect(
      within(rowOf(cancelledOrder.number)).queryByText(texts.overdueMark),
    ).not.toBeInTheDocument();
  });

  it('до срока отметки просрочки нет ни у одного наряда', () => {
    render(<OrderTable items={[order, freshOrder]} columns={ACTIVE} now={BEFORE} />);

    expect(screen.queryByText(texts.overdueMark)).not.toBeInTheDocument();
  });

  it('🔴 просрочка не подменяет статус: словарь статусов от неё не растёт', () => {
    render(<OrderTable items={[order]} columns={ACTIVE} now={AFTER} />);

    expect(within(rowOf(order.number)).getByText(ORDER_STATUS_TITLE.assigned)).toBeInTheDocument();
  });

  it('🔴 монтажнику суммы не показывают: колонки нет вовсе', () => {
    render(<OrderTable items={[installerOrder]} columns={ACTIVE} now={BEFORE} forInstaller />);

    expect(screen.queryByRole('columnheader', { name: texts.colSum })).not.toBeInTheDocument();
    expect(screen.queryByText(texts.money(installerOrder.price ?? 0))).not.toBeInTheDocument();
  });

  it('наряд без исполнителя говорит об этом словом, а не пустой ячейкой', () => {
    render(<OrderTable items={[freshOrder]} columns={ACTIVE} now={BEFORE} />);

    expect(
      within(rowOf(freshOrder.number)).getAllByText(texts.installerNone).length,
    ).toBeGreaterThan(0);
  });

  it('строка ведёт в карточку номером наряда', () => {
    render(<OrderTable items={[order]} columns={ACTIVE} now={BEFORE} />);

    expect(screen.getByRole('link', { name: texts.number(order.number) })).toHaveAttribute(
      'href',
      `/admin/orders/${order.id}`,
    );
  });

  it('🔴 галочка выбора подписана номером наряда, а не «выбрать»', () => {
    render(<OrderTable items={[order]} columns={ACTIVE} selectable now={BEFORE} />);

    expect(screen.getByRole('checkbox', { name: texts.rowSelect(order.number) })).toHaveAttribute(
      'value',
      order.id,
    );
  });
});
