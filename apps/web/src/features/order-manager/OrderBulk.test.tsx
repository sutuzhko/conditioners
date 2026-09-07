import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { visibleColumns } from './columns';
import { orderManagerContent as texts } from './content';
import { acceptingBulkApi, freshOrder, installers, order, selfEmployedInstaller } from './fixtures';
import { OrderBulk } from './OrderBulk';
import { OrderTable } from './OrderTable';

/* Роутер панели: полоса освежает список после назначения, и без подмены
   компонент падает на `useRouter` вне приложения. */
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

/** Момент отсчёта просрочки задан числом: иначе тест зависел бы от даты. */
const NOW = '2026-08-27T09:00:00.000Z';

function renderBulk(api = acceptingBulkApi) {
  return render(
    <OrderBulk
      total={24}
      pageCount={2}
      installers={installers}
      api={api}
      confirm={async () => true}
      onDone={() => undefined}
    >
      <OrderTable
        items={[order, freshOrder]}
        columns={visibleColumns('active')}
        selectable
        now={NOW}
      />
    </OrderBulk>,
  );
}

describe('Панель режима выбора нарядов', () => {
  /* 🔴 Главное утверждение задачи #738: панель не появляется и не исчезает.
     Её появление по первой галочке уводило таблицу вниз на 74px вместе со
     строкой, по которой в этот момент целились. */
  it('🔴 стоит на месте до выбора: счёт и оба действия есть в разметке сразу', () => {
    renderBulk();

    expect(screen.getByText(texts.selectedNone)).toBeInTheDocument();
    expect(screen.getByLabelText(texts.bulkAssignLabel)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(texts.selectionClear) }),
    ).toBeInTheDocument();
  });

  it('до выбора действия отключены и называют причину словами', () => {
    renderBulk();

    const assign = screen.getByRole('button', { name: new RegExp(texts.bulkAssign) });
    expect(assign).toHaveAttribute('aria-disabled', 'true');
    expect(assign).toHaveAccessibleName(new RegExp(texts.bulkOffEmpty));
    expect(screen.getByLabelText(texts.bulkAssignLabel)).toBeDisabled();
  });

  it('галочка строки включает режим: счёт называет и выбранное, и всю стопку', async () => {
    renderBulk();

    await userEvent.click(screen.getByLabelText(texts.rowSelect(order.number)));

    expect(screen.getByText(texts.selectedOf(1, 24))).toBeInTheDocument();
  });

  it('«выбрать все на странице» берёт обе строки, «снять выбор» возвращает к нулю', async () => {
    renderBulk();

    await userEvent.click(screen.getByLabelText(texts.selectAll));
    expect(screen.getByText(texts.selectedOf(2, 24))).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: new RegExp(texts.selectionClear) }));
    expect(screen.getByText(texts.selectedNone)).toBeInTheDocument();
  });

  it('назначение уходит на сервер выбранными идентификаторами', async () => {
    const api = { assign: vi.fn(async () => ({ ok: true as const })) };
    renderBulk(api);

    await userEvent.click(screen.getByLabelText(texts.rowSelect(order.number)));
    await userEvent.selectOptions(
      screen.getByLabelText(texts.bulkAssignLabel),
      selfEmployedInstaller.id,
    );
    await userEvent.click(screen.getByRole('button', { name: texts.bulkAssign }));

    await waitFor(() =>
      expect(api.assign).toHaveBeenCalledWith([order.id], selfEmployedInstaller.id),
    );
  });
});
