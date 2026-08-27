import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderForm } from './OrderForm';
import { DEDUCTION_NOTE, orderManagerContent as texts } from './content';
import {
  acceptingApi,
  blocks,
  clients,
  draft,
  failingApi,
  installers,
  order,
  pendingApi,
  staffDraft,
  staffInstaller,
  unassignedDraft,
} from './fixtures';

const lists = { clients, installers } as const;

/* У обязательного поля к подписи добавляется звёздочка — ищем по началу. */
const reasonLabel = new RegExp(`^${texts.deductionReason}`);

describe('Форма наряда', () => {
  it('заводит наряд и очищает форму: следующий вводят сразу', async () => {
    const user = userEvent.setup();
    const create = vi.fn(async () => ({ ok: true, id: 'o9' }) as const);

    render(<OrderForm {...lists} api={{ ...acceptingApi, create }} initial={draft} />);

    await user.click(screen.getByRole('button', { name: texts.add }));

    expect(create).toHaveBeenCalledWith(draft);
    expect(await screen.findByText(texts.added)).toBeInTheDocument();
    expect(screen.getByLabelText(texts.address)).toHaveValue('');
  });

  it('правка оставляет введённое на месте: наряд продолжают смотреть', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(
      <OrderForm {...lists} api={{ ...acceptingApi, update }} orderId={order.id} initial={draft} />,
    );

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(update).toHaveBeenCalledWith(order.id, draft);
    expect(screen.getByLabelText(texts.address)).toHaveValue(draft.address);
  });

  it('🔴 ошибка сервера с полем подсвечивает поле, а не висит внизу', async () => {
    const user = userEvent.setup();

    render(
      <OrderForm
        {...lists}
        api={failingApi}
        orderId={order.id}
        initial={{ ...draft, deductionSum: '1500', deductionReason: 'Брак' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByText('Укажите основание удержания')).toBeInTheDocument();
    expect(screen.getByLabelText(reasonLabel)).toHaveAttribute('aria-invalid', 'true');
  });

  it('🔴 удержание без основания не уходит на сервер: схема ловит его на месте', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(
      <OrderForm
        {...lists}
        api={{ ...acceptingApi, update }}
        orderId={order.id}
        initial={{ ...draft, deductionSum: '1500', deductionReason: '' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByLabelText(reasonLabel)).toHaveAttribute('aria-invalid', 'true');
  });

  it('🔴 трудовой договор: форма говорит, что удержание из выплаты не вычитается', () => {
    render(<OrderForm {...lists} orderId={order.id} initial={staffDraft} api={acceptingApi} />);

    expect(screen.getByText(DEDUCTION_NOTE.internal)).toBeInTheDocument();
  });

  it('самозанятому то же поле означает уменьшение вознаграждения', () => {
    render(<OrderForm {...lists} orderId={order.id} initial={draft} api={acceptingApi} />);

    expect(screen.getByText(DEDUCTION_NOTE.reduces)).toBeInTheDocument();
  });

  it('🔴 монтажник не назначен — ведём себя осторожно, как при трудовом договоре', () => {
    render(
      <OrderForm {...lists} orderId={order.id} initial={unassignedDraft} api={acceptingApi} />,
    );

    expect(screen.getByText(DEDUCTION_NOTE.unassigned)).toBeInTheDocument();
  });

  it('оформление не заведено — тоже не разрешение уменьшать выплату', () => {
    render(
      <OrderForm
        {...lists}
        orderId={order.id}
        initial={{ ...draft, installerId: 'u4' }}
        api={acceptingApi}
      />,
    );

    expect(screen.getByText(DEDUCTION_NOTE.unknown)).toBeInTheDocument();
  });

  it('у нового наряда статуса нет: его назначает сервер', () => {
    render(<OrderForm {...lists} api={acceptingApi} />);

    expect(screen.queryByLabelText(texts.status)).not.toBeInTheDocument();
  });

  it('у заведённого наряда владелец меняет статус сам', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(
      <OrderForm {...lists} api={{ ...acceptingApi, update }} orderId={order.id} initial={draft} />,
    );

    await user.selectOptions(screen.getByLabelText(texts.status), 'cancelled');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(update).toHaveBeenCalledWith(order.id, { ...draft, status: 'cancelled' });
  });

  it('кнопка блокируется на время отправки', async () => {
    const user = userEvent.setup();

    render(<OrderForm {...lists} api={pendingApi} orderId={order.id} initial={draft} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(screen.getByRole('button', { name: texts.saving })).toBeDisabled();
  });

  it('удаления у нового наряда нет: удалять ещё нечего', () => {
    render(<OrderForm {...lists} api={acceptingApi} removable />);

    expect(screen.queryByRole('button', { name: texts.remove })).not.toBeInTheDocument();
  });

  it('удаление спрашивает подтверждение и сообщает наверх', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);
    const onRemoved = vi.fn();

    render(
      <OrderForm
        {...lists}
        api={{ ...acceptingApi, remove }}
        orderId={order.id}
        orderNumber={order.number}
        initial={draft}
        removable
        confirm={async () => true}
        onRemoved={onRemoved}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(remove).toHaveBeenCalledWith(order.id);
    expect(onRemoved).toHaveBeenCalled();
  });

  it('🔴 отказ от подтверждения ничего не удаляет', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);

    render(
      <OrderForm
        {...lists}
        api={{ ...acceptingApi, remove }}
        orderId={order.id}
        initial={draft}
        removable
        confirm={async () => false}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(remove).not.toHaveBeenCalled();
  });

  it('позиции наряда правятся прямо в форме', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(
      <OrderForm
        {...lists}
        api={{ ...acceptingApi, update }}
        orderId={order.id}
        initial={{ ...draft, units: [] }}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.unitAdd }));
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(update).toHaveBeenCalledWith(
      order.id,
      expect.objectContaining({ units: [expect.objectContaining({ equip: 'conditioner' })] }),
    );
  });
});

/**
 * 🔴 Занятость предупреждает, а не запрещает (ADR-115): срочный ремонт в
 * июльскую жару важнее запрета, и решение остаётся за владельцем.
 */
describe('Форма наряда: занятость монтажника', () => {
  it('предупреждает, когда день выбранного монтажника закрыт целиком', () => {
    render(<OrderForm {...lists} blocks={blocks} initial={draft} api={acceptingApi} />);

    /* Наряд назначен на 28 августа самозанятому — у него на этот день
       заведена занятость без окна, то есть весь день. */
    expect(screen.getByText(/Дмитрий Соколов —/)).toBeInTheDocument();
  });

  it('🔴 не запрещает: кнопка отправки остаётся рабочей', async () => {
    const user = userEvent.setup();
    const create = vi.fn(async () => ({ ok: true, id: 'o9' }) as const);

    render(
      <OrderForm {...lists} blocks={blocks} initial={draft} api={{ ...acceptingApi, create }} />,
    );

    expect(screen.getByRole('button', { name: texts.add })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: texts.add }));

    expect(create).toHaveBeenCalled();
  });

  it('🔴 занятость личная: чужой закрытый день о выбранном монтажнике не говорит', async () => {
    const user = userEvent.setup();

    render(<OrderForm {...lists} blocks={blocks} initial={draft} api={acceptingApi} />);

    /* Второй монтажник занят с 14 до 16, а наряд стоит на 11:00 — окно и
       наряд не пересекаются, предупреждать не о чем. */
    await user.selectOptions(screen.getByLabelText(texts.installer), staffInstaller.id);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('предупреждает, когда наряд попадает в занятое окно по часам', async () => {
    const user = userEvent.setup();

    render(
      <OrderForm
        {...lists}
        blocks={blocks}
        initial={{ ...draft, installerId: staffInstaller.id, time: '14:30' }}
        api={acceptingApi}
      />,
    );

    expect(screen.getByText(/Артём Белов —/)).toBeInTheDocument();

    /* Сдвинули за границу окна — предупреждение уходит само. */
    await user.clear(screen.getByLabelText(texts.time));
    await user.type(screen.getByLabelText(texts.time), '17:00');

    expect(screen.queryByText(/Артём Белов —/)).not.toBeInTheDocument();
  });

  it('без назначенного монтажника занятость не показывается: некого предупреждать', () => {
    render(<OrderForm {...lists} blocks={blocks} initial={unassignedDraft} api={acceptingApi} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
