import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StockMoveForm } from './StockMoveForm';
import { stockManagerContent as texts } from './content';
import { acceptingApi, archivedZone, itemRefs, moveDraft, van, warehouse, zones } from './fixtures';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

const single = itemRefs.slice(0, 1);
const qtyField = /^Количество/;
const deltaField = /^Поправка/;

describe('Форма движения', () => {
  it('🔴 списания в наряд и возврата здесь нет: они живут в карточке наряда', () => {
    render(<StockMoveForm items={itemRefs} zones={zones} />);

    const kinds = screen.getByLabelText(texts.moveKind);
    expect(within(kinds).queryByText('Списание в наряд')).not.toBeInTheDocument();
    expect(within(kinds).queryByText('Возврат с объекта')).not.toBeInTheDocument();
  });

  it('известная позиция не подменяется списком из одного пункта', () => {
    render(<StockMoveForm items={single} zones={zones} />);

    expect(screen.queryByLabelText(texts.moveItem)).not.toBeInTheDocument();
    expect(screen.getByText(single[0]?.name ?? '')).toBeVisible();
  });

  it('приход: позиция, количество и зона — больше ничего не требуется', async () => {
    const user = userEvent.setup();
    const move = vi.fn(async () => ({ ok: true }) as const);

    render(<StockMoveForm items={single} zones={zones} api={{ ...acceptingApi, move }} />);

    expect(screen.queryByLabelText(texts.moveFrom)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(qtyField), '12,5');
    await user.selectOptions(screen.getByLabelText(texts.moveTo), warehouse.id);
    await user.click(screen.getByRole('button', { name: texts.moveSubmit }));

    expect(move).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'income', qty: '12,5', toZoneId: warehouse.id }),
    );
    expect(await screen.findByText(texts.moveDone)).toBeVisible();
    expect(screen.getByLabelText(qtyField)).toHaveValue('');
  });

  it('перемещение спрашивает зону-источник', async () => {
    const user = userEvent.setup();
    const move = vi.fn(async () => ({ ok: true }) as const);

    render(<StockMoveForm items={single} zones={zones} api={{ ...acceptingApi, move }} />);

    await user.selectOptions(screen.getByLabelText(texts.moveKind), 'transfer');
    await user.type(screen.getByLabelText(qtyField), '15');
    await user.selectOptions(screen.getByLabelText(texts.moveFrom), warehouse.id);
    await user.selectOptions(screen.getByLabelText(texts.moveTo), van.id);
    await user.click(screen.getByRole('button', { name: texts.moveSubmit }));

    expect(move).toHaveBeenCalledWith(
      expect.objectContaining({ fromZoneId: warehouse.id, toZoneId: van.id }),
    );
  });

  it('перемещение в ту же зону не проводится', async () => {
    const user = userEvent.setup();
    const move = vi.fn(async () => ({ ok: true }) as const);

    render(<StockMoveForm items={single} zones={zones} api={{ ...acceptingApi, move }} />);

    await user.selectOptions(screen.getByLabelText(texts.moveKind), 'transfer');
    await user.type(screen.getByLabelText(qtyField), '15');
    await user.selectOptions(screen.getByLabelText(texts.moveFrom), warehouse.id);
    await user.selectOptions(screen.getByLabelText(texts.moveTo), warehouse.id);
    await user.click(screen.getByRole('button', { name: texts.moveSubmit }));

    expect(move).not.toHaveBeenCalled();
    expect(await screen.findByText('Переместить можно только в другую зону')).toBeVisible();
  });

  it('🔴 инвентаризация без основания не проводится — подсказка приходит до отправки', async () => {
    const user = userEvent.setup();
    const move = vi.fn(async () => ({ ok: true }) as const);

    render(<StockMoveForm items={single} zones={zones} api={{ ...acceptingApi, move }} />);

    await user.selectOptions(screen.getByLabelText(texts.moveKind), 'count');
    await user.type(screen.getByLabelText(deltaField), '-2,5');
    await user.selectOptions(screen.getByLabelText(texts.moveZone), warehouse.id);
    await user.click(screen.getByRole('button', { name: texts.moveSubmit }));

    expect(move).not.toHaveBeenCalled();
    expect(await screen.findByText('Инвентаризация без основания не проводится')).toBeVisible();
  });

  it('🔴 инвентаризация принимает поправку со знаком: она и добавляет, и убавляет', async () => {
    const user = userEvent.setup();
    const move = vi.fn(async () => ({ ok: true }) as const);

    render(<StockMoveForm items={single} zones={zones} api={{ ...acceptingApi, move }} />);

    await user.selectOptions(screen.getByLabelText(texts.moveKind), 'count');
    await user.type(screen.getByLabelText(deltaField), '-2,5');
    await user.selectOptions(screen.getByLabelText(texts.moveZone), warehouse.id);
    await user.type(screen.getByLabelText(/^Основание/), 'Обрезки не списывали');
    await user.click(screen.getByRole('button', { name: texts.moveSubmit }));

    expect(move).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'count', qty: '-2,5', reason: 'Обрезки не списывали' }),
    );
  });

  it('серийные номера спрашиваются только у прихода', async () => {
    const user = userEvent.setup();
    render(<StockMoveForm items={single} zones={zones} />);

    expect(screen.getByLabelText(texts.moveSerials)).toBeVisible();

    await user.selectOptions(screen.getByLabelText(texts.moveKind), 'transfer');
    expect(screen.queryByLabelText(texts.moveSerials)).not.toBeInTheDocument();
  });

  it('архивная зона в выбор не попадает: движений в ней уже не будет', () => {
    render(<StockMoveForm items={single} zones={[warehouse, archivedZone]} />);

    const zone = screen.getByLabelText(texts.moveTo);
    expect(within(zone).getByRole('option', { name: warehouse.name })).toBeInTheDocument();
    expect(within(zone).queryByRole('option', { name: archivedZone.name })).not.toBeInTheDocument();
  });

  it('🔴 зон нет — проводить движение некуда, и форма говорит об этом прямо', () => {
    render(<StockMoveForm items={single} zones={[]} />);

    expect(screen.getByText(texts.moveNoZones)).toBeVisible();
    expect(screen.queryByRole('button', { name: texts.moveSubmit })).not.toBeInTheDocument();
  });

  it('позиций нет — проводить движение нечего', () => {
    render(<StockMoveForm items={[]} zones={zones} />);

    expect(screen.getByText(texts.moveNoItems)).toBeVisible();
  });

  it('с одной зоной перемещение недоступно и объяснено', async () => {
    const user = userEvent.setup();
    render(<StockMoveForm items={single} zones={[warehouse]} />);

    await user.selectOptions(screen.getByLabelText(texts.moveKind), 'transfer');

    expect(screen.getByText(texts.moveNoSecondZone)).toBeVisible();
    expect(screen.getByRole('button', { name: texts.moveSubmit })).toBeDisabled();
  });

  it('отказ сервера объясняется словами и не теряет введённое', async () => {
    const user = userEvent.setup();

    render(
      <StockMoveForm
        items={single}
        zones={zones}
        api={{ ...acceptingApi, move: async () => ({ ok: false, message: texts.serverError }) }}
      />,
    );

    await user.type(screen.getByLabelText(qtyField), '12,5');
    await user.selectOptions(screen.getByLabelText(texts.moveTo), warehouse.id);
    await user.click(screen.getByRole('button', { name: texts.moveSubmit }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.serverError);
    expect(screen.getByLabelText(qtyField)).toHaveValue('12,5');
  });

  it('🔴 отпущенная ячейка приносит позицию и обе зоны: вводят одно количество', () => {
    render(<StockMoveForm items={single} zones={zones} initial={moveDraft} />);

    expect(screen.getByLabelText(texts.moveFrom)).toHaveValue(warehouse.id);
    expect(screen.getByLabelText(texts.moveTo)).toHaveValue(van.id);
    expect(screen.getByLabelText(qtyField)).toHaveValue('');
  });

  it('🔴 курсор встаёт в количество: всё остальное уже подставил адрес', async () => {
    render(<StockMoveForm items={single} zones={zones} initial={moveDraft} autoFocusQty />);

    await waitFor(() => expect(screen.getByLabelText(qtyField)).toHaveFocus());
  });

  it('без просьбы фокус никуда не уводится: на странице форма не единственная', () => {
    render(<StockMoveForm items={single} zones={zones} initial={moveDraft} />);

    expect(screen.getByLabelText(qtyField)).not.toHaveFocus();
  });
});
