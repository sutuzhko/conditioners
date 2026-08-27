import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StockCreateModal } from './StockCreateModal';
import { stockManagerContent as texts } from './content';
import { acceptingApi, moveDraft, people, products, itemRefs, zones } from './fixtures';

const back = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back, replace, refresh, push: vi.fn() }),
}));

/** Есть ли куда возвращаться: единица означает вкладку, открытую на адресе окна. */
function historyLength(length: number): void {
  vi.spyOn(globalThis.history, 'length', 'get').mockReturnValue(length);
}

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  refresh.mockClear();
  historyLength(3);
});

describe('Окна создания раздела склада', () => {
  it('🔴 позиция заводится окном, а не формой над таблицей', () => {
    render(<StockCreateModal creation={{ kind: 'item', products }} api={acceptingApi} />);

    expect(screen.getByRole('dialog', { name: texts.itemAddTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(texts.itemName)).toBeVisible();
    /* Заголовок один — его даёт окно: форма со своим вторым таким же была бы
       панелью в панели, а читалка объявляла бы название дважды. */
    expect(screen.getAllByRole('heading', { name: texts.itemAddTitle })).toHaveLength(1);
  });

  it('после сохранения окно уходит шагом назад, а список под ним обновляется', async () => {
    const user = userEvent.setup();
    render(<StockCreateModal creation={{ kind: 'item', products }} api={acceptingApi} />);

    await user.type(screen.getByLabelText(texts.itemName), 'Хомут 20 мм');
    await user.click(screen.getByRole('button', { name: texts.itemAdd }));

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
    expect(refresh).toHaveBeenCalled();
  });

  it('🔴 вкладку открыли прямо на адресе окна — уходим на запасной адрес', async () => {
    const user = userEvent.setup();
    historyLength(1);

    render(<StockCreateModal creation={{ kind: 'zone', people }} api={acceptingApi} />);

    await user.type(screen.getByLabelText(texts.zoneName), 'Гараж на Демидовской');
    await user.click(screen.getByRole('button', { name: texts.zoneAdd }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/stock/zones'));
    expect(back).not.toHaveBeenCalled();
  });

  it('окно движения открывается с подставленными позицией и зонами', () => {
    render(
      <StockCreateModal
        creation={{ kind: 'move', items: itemRefs.slice(0, 1), zones, initial: moveDraft }}
        api={acceptingApi}
      />,
    );

    expect(screen.getByRole('dialog', { name: texts.moveTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(texts.moveFrom)).toHaveValue(moveDraft.fromZoneId);
    expect(screen.getByLabelText(texts.moveTo)).toHaveValue(moveDraft.toZoneId);
  });

  it('🔴 всё под окном помечено inert: читалка не уходит гулять по списку', () => {
    const { baseElement } = render(
      <StockCreateModal creation={{ kind: 'item', products }} api={acceptingApi} />,
    );

    const covered = [...baseElement.children].filter(
      (node) => node.querySelector('[role="dialog"]') === null,
    );

    expect(covered.length).toBeGreaterThan(0);
    for (const node of covered) expect(node).toHaveAttribute('inert');
  });
});
