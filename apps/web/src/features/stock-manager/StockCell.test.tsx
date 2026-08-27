import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StockCell } from './StockCell';
import { StockMoveScope } from './StockMoveScope';
import { stockManagerContent as texts } from './content';
import { archivedZone, pipe, van, warehouse } from './fixtures';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

function grid() {
  return render(
    <StockMoveScope>
      <table>
        <tbody>
          <tr>
            <StockCell
              itemId={pipe.id}
              itemName={pipe.name}
              unit={pipe.unit}
              zoneId={warehouse.id}
              zoneName={warehouse.name}
              qty={43.5}
              first
            />
            <StockCell
              itemId={pipe.id}
              itemName={pipe.name}
              unit={pipe.unit}
              zoneId={van.id}
              zoneName={van.name}
              qty={0}
            />
          </tr>
        </tbody>
      </table>
    </StockMoveScope>,
  );
}

/** Имя ячейки собирается теми же подписями, что и в разметке: неразрывный
    пробел между числом и единицей — часть величины, а не оформление. */
const nameOf = (zone: string, qty: number, tail?: string): string => {
  const head = texts.cellLabel(pipe.name, zone, texts.qty(qty, pipe.unit));
  return tail === undefined ? head : `${head} — ${tail}`;
};

const cellOf = (zone: string, qty: number, tail?: string): HTMLElement =>
  screen.getByRole('button', { name: nameOf(zone, qty, tail) });

describe('Ячейка остатка', () => {
  it('имя ячейки называет позицию и зону: одно число вне таблицы не значит ничего', () => {
    grid();

    expect(cellOf(warehouse.name, 43.5, texts.cellTake)).toBeVisible();
  });

  it('🔴 остаток берётся и кладётся с клавиатуры: перетаскивание — не единственный путь', async () => {
    const user = userEvent.setup();
    push.mockClear();
    grid();

    await user.click(cellOf(warehouse.name, 43.5, texts.cellTake));

    /* Взятое объявлено голосом, а не только подсвечено. */
    expect(screen.getByRole('status')).toHaveTextContent(texts.grabbed(pipe.name, warehouse.name));

    await user.click(cellOf(van.name, 0, texts.cellDrop));

    /* Отпускание не проводит движение молча — открывает форму с подстановкой. */
    expect(push).toHaveBeenCalledWith(
      `/admin/stock/move?item=${pipe.id}&from=${warehouse.id}&to=${van.id}`,
    );
  });

  it('взятое отпускается повторным нажатием и клавишей Escape', async () => {
    const user = userEvent.setup();
    grid();

    const source = cellOf(warehouse.name, 43.5, texts.cellTake);
    await user.click(source);
    await user.click(cellOf(warehouse.name, 43.5, texts.cellHeld));

    expect(screen.getByRole('status')).toHaveTextContent(texts.grabCancelled);

    await user.click(source);
    await user.keyboard('{Escape}');

    expect(screen.getByRole('status')).toHaveTextContent(texts.grabCancelled);
  });

  it('пустая зона объясняет, почему из неё ничего не взять', async () => {
    const user = userEvent.setup();
    grid();

    await user.click(cellOf(van.name, 0));

    expect(screen.getByRole('status')).toHaveTextContent(texts.grabEmpty(van.name));
  });

  it('🔴 сетка — одна остановка табуляции, внутри ходят стрелками', async () => {
    const user = userEvent.setup();
    grid();

    const source = cellOf(warehouse.name, 43.5, texts.cellTake);
    const empty = cellOf(van.name, 0);

    expect(source).toHaveAttribute('tabindex', '0');
    expect(empty).toHaveAttribute('tabindex', '-1');

    act(() => source.focus());
    await user.keyboard('{ArrowRight}');
    expect(empty).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(source).toHaveFocus();
  });

  it('🔴 перетаскивание мышью приводит туда же, куда клавиатура', () => {
    push.mockClear();
    grid();

    /* jsdom не умеет настоящего перетаскивания: подставляем ту же посылку,
       какую браузер кладёт в событие. */
    const dataTransfer = { setData: vi.fn(), dropEffect: '', effectAllowed: '' };
    const source = cellOf(warehouse.name, 43.5, texts.cellTake);

    fireEvent.dragStart(source, { dataTransfer });

    const target = cellOf(van.name, 0, texts.cellDrop);
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(push).toHaveBeenCalledWith(
      `/admin/stock/move?item=${pipe.id}&from=${warehouse.id}&to=${van.id}`,
    );
  });

  it('зона в архиве не принимает груз: движений в неё уже не будет', async () => {
    const user = userEvent.setup();
    render(
      <StockMoveScope>
        <table>
          <tbody>
            <tr>
              <StockCell
                itemId={pipe.id}
                itemName={pipe.name}
                unit={pipe.unit}
                zoneId={warehouse.id}
                zoneName={warehouse.name}
                qty={43.5}
                first
              />
              <StockCell
                itemId={pipe.id}
                itemName={pipe.name}
                unit={pipe.unit}
                zoneId={archivedZone.id}
                zoneName={archivedZone.name}
                qty={2}
                closed
              />
            </tr>
          </tbody>
        </table>
      </StockMoveScope>,
    );

    await user.click(cellOf(warehouse.name, 43.5, texts.cellTake));

    expect(cellOf(archivedZone.name, 2, texts.cellClosed)).toBeVisible();
  });
});
