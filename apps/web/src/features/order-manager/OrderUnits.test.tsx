import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { OrderUnits } from './OrderUnits';
import { orderManagerContent as texts } from './content';
import { unitDrafts } from './fixtures';
import type { OrderUnitDraft } from './model';

/** Редактор управляемый: состояние в тесте держит эта обвязка, как в форме. */
function Harness({ initial }: { readonly initial: readonly OrderUnitDraft[] }) {
  const [units, setUnits] = useState<readonly OrderUnitDraft[]>(initial);
  return <OrderUnits units={units} onChange={setUnits} />;
}

describe('Позиции оборудования', () => {
  it('пустой список объясняет, почему позиций может не быть', () => {
    render(<Harness initial={[]} />);

    expect(screen.getByText(texts.unitsEmpty)).toBeInTheDocument();
  });

  it('добавляет позицию', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[]} />);

    await user.click(screen.getByRole('button', { name: texts.unitAdd }));

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText(texts.unitsEmpty)).not.toBeInTheDocument();
  });

  it('🔴 позиций может быть несколько — это половина смысла наряда', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[]} />);

    await user.click(screen.getByRole('button', { name: texts.unitAdd }));
    await user.click(screen.getByRole('button', { name: texts.unitAdd }));

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('🔴 удаляет ту позицию, на которой нажали, а не соседнюю', async () => {
    const user = userEvent.setup();
    render(<Harness initial={unitDrafts} />);

    const first = unitDrafts[0];
    const second = unitDrafts[1];
    if (first === undefined || second === undefined) throw new Error('нужны две позиции');

    await user.click(screen.getByRole('button', { name: texts.unitRemove(1) }));

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(within(rows[0] ?? document.body).getByLabelText(texts.unitModel)).toHaveValue(
      second.model,
    );
  });

  it('правит поле позиции, не трогая соседнюю', async () => {
    const user = userEvent.setup();
    render(<Harness initial={unitDrafts} />);

    const rows = screen.getAllByRole('listitem');
    const firstRow = rows[0] ?? document.body;
    const secondRow = rows[1] ?? document.body;

    const diameter = within(firstRow).getByLabelText(texts.unitDiameter);
    await user.clear(diameter);
    await user.type(diameter, '1/2');

    expect(diameter).toHaveValue('1/2');
    expect(within(secondRow).getByLabelText(texts.unitDiameter)).toHaveValue(
      unitDrafts[1]?.diameter,
    );
  });

  it('штробление отмечается по позиции, а не на весь наряд', async () => {
    const user = userEvent.setup();
    render(<Harness initial={unitDrafts} />);

    const rows = screen.getAllByRole('listitem');
    const second = within(rows[1] ?? document.body).getByLabelText(texts.unitShtrob);

    expect(second).not.toBeChecked();
    await user.click(second);
    expect(second).toBeChecked();
    expect(within(rows[0] ?? document.body).getByLabelText(texts.unitShtrob)).toBeChecked();
  });
});
