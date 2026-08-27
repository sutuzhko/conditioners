import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { StockCell } from './StockCell';
import { StockMoveScope } from './StockMoveScope';
import { stockManagerContent as texts } from './content';
import { archivedZone, pipe, van, warehouse } from './fixtures';

/**
 * Ячейка остатка — она же ручка перемещения между зонами (ADR-137).
 *
 * Живёт только внутри таблицы: смысл ячейки задают строка и колонка, поэтому
 * истории показывают её в настоящей строке, а не поодиночке.
 */
const meta = {
  title: 'Админка/Склад · Ячейка остатка',
  component: StockCell,
  args: {
    itemId: pipe.id,
    itemName: pipe.name,
    unit: pipe.unit,
    zoneId: warehouse.id,
    zoneName: warehouse.name,
    qty: 43.5,
    first: true,
  },
  render: (args) => (
    <StockMoveScope>
      <table>
        <tbody>
          <tr>
            <StockCell {...args} />
            <StockCell
              itemId={pipe.id}
              itemName={pipe.name}
              unit={pipe.unit}
              zoneId={van.id}
              zoneName={van.name}
              qty={12}
            />
            <StockCell
              itemId={pipe.id}
              itemName={pipe.name}
              unit={pipe.unit}
              zoneId={archivedZone.id}
              zoneName={archivedZone.name}
              qty={0}
              closed
            />
          </tr>
        </tbody>
      </table>
    </StockMoveScope>
  ),
} satisfies Meta<typeof StockCell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Обычный остаток: его можно взять мышью или Enter'ом. */
export const Базовое: Story = {};

/** Ноль приглушён: «здесь ничего нет» не спорит за внимание с остатком. */
export const Ноль: Story = {
  args: { qty: 0 },
};

/** 🔴 Минус — предупреждение, а не отказ: склад разошёлся с реальностью. */
export const Минус: Story = {
  args: { qty: -1.5 },
};

/**
 * Взятый остаток и зоны, куда его можно положить: то же состояние, которое
 * даёт перетаскивание, но полученное с клавиатуры.
 */
export const Взято: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', {
        name: `${texts.cellLabel(pipe.name, warehouse.name, texts.qty(43.5, pipe.unit))} — ${texts.cellTake}`,
      }),
    );
  },
};
