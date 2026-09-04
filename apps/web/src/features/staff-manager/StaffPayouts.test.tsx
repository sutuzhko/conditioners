import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StaffPayouts } from './StaffPayouts';
import { staffManagerContent as texts } from './content';
import { emptyTotals, heldOrder, orderWithoutReason, staffOrders, staffTotals } from './fixtures';

/**
 * Сумма на экране набрана неразрывными пробелами — число и рубль одна
 * величина. Нормализатор Testing Library их не схлопывает, поэтому искать
 * приходится по обычным (тот же приём, что в тестах карточки заявки).
 */
const money = (value: number): string => texts.money(value).replace(/\s/g, ' ');

describe('Выплаты и удержания монтажника', () => {
  /* 🔴 Штрафов как вида взыскания в ТК РФ нет, удержания ограничены статьёй
     137 (CRM.md §9, ADR-114). Слово не должно появиться ни в одной подписи. */
  it('🔴 не произносит слово «штраф»', () => {
    const { container } = render(<StaffPayouts totals={staffTotals} orders={staffOrders} />);

    expect(container.textContent).not.toMatch(/штраф/i);
  });

  /* 🔴 Удержанное не вычтено из заработанного: вычитать законно не при всяком
     оформлении, и решает это договор, а не таблица. */
  it('🔴 показывает удержанное отдельно от заработанного', () => {
    render(<StaffPayouts totals={staffTotals} orders={staffOrders} />);

    /* Ищем внутри плиток, а не по всему экрану: та же сумма стоит и строкой
       движения, и это не совпадение, а её происхождение. */
    const tiles = screen.getByRole('group', { name: texts.tilesLabel });

    expect(within(tiles).getByText(money(staffTotals.feeDone))).toBeInTheDocument();
    expect(within(tiles).getByText(money(staffTotals.deductions))).toBeInTheDocument();
    expect(within(tiles).getByText(texts.tileHeldNote)).toBeInTheDocument();
  });

  it('в движения попадают только наряды с деньгами', () => {
    const free = staffOrders.map((order) => ({ ...order, fee: 0, deduction: 0 }));
    render(<StaffPayouts totals={emptyTotals} orders={free} />);

    expect(screen.getByText(texts.payoutsEmpty)).toBeInTheDocument();
  });

  it('удержание несёт основание и ссылку на наряд', () => {
    render(<StaffPayouts totals={staffTotals} orders={[heldOrder]} />);

    expect(screen.getByText(heldOrder.deductionReason ?? '')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: texts.orderNumber(heldOrder.number) })).toHaveAttribute(
      'href',
      `/admin/orders/${heldOrder.id}`,
    );
  });

  /* 🔴 Запись без основания — дефект данных, а не «ноль»: молчащая ячейка
     выглядела бы законной записью. */
  it('🔴 называет удержание без основания дефектом, а не пустой ячейкой', () => {
    render(<StaffPayouts totals={staffTotals} orders={[orderWithoutReason]} />);

    expect(screen.getByText(texts.reasonMissing)).toBeInTheDocument();
  });
});
