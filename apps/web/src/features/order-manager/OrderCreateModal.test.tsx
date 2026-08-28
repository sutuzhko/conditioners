import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderCreateModal } from './OrderCreateModal';
import { orderManagerContent as texts } from './content';
import { acceptingApi, clients, draft, installers, selfEmployedInstaller } from './fixtures';

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

const lists = { clients, installers } as const;

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  refresh.mockClear();
  historyLength(3);
});

describe('Окно заведения наряда', () => {
  it('🔴 наряд заводится окном, а не отдельной страницей', () => {
    render(<OrderCreateModal {...lists} api={acceptingApi} />);

    expect(screen.getByRole('dialog', { name: texts.addTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(texts.address)).toBeVisible();
    expect(screen.getByRole('button', { name: texts.add })).toBeVisible();
    /* Заголовок один — его даёт окно: форма со своим вторым таким же была бы
       панелью в панели, а читалка объявляла бы название дважды. */
    expect(screen.getAllByRole('heading', { name: texts.addTitle })).toHaveLength(1);
  });

  it('🔴 статуса у нового наряда нет: его назначает сервер, а не форма', () => {
    render(<OrderCreateModal {...lists} api={acceptingApi} />);

    expect(screen.queryByLabelText(texts.status)).not.toBeInTheDocument();
  });

  it('после сохранения окно уходит шагом назад, а список под ним обновляется', async () => {
    const user = userEvent.setup();
    const create = vi.fn(async () => ({ ok: true, id: 'o9' }) as const);

    const view = render(
      <OrderCreateModal {...lists} api={{ ...acceptingApi, create }} initial={draft} />,
    );

    await user.click(screen.getByRole('button', { name: texts.add }));

    expect(create).toHaveBeenCalledWith(draft);
    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));

    /* 🔴 Список обновляет кит, когда окно уже ушло: `refresh()`, начатый до
       шага назад, роутер отбрасывает вместе с переходом. Уход окна — это его
       размонтирование. */
    view.unmount();
    expect(refresh).toHaveBeenCalled();
  });

  it('🔴 вкладку открыли прямо на адресе окна — уходим на запасной адрес', async () => {
    const user = userEvent.setup();
    historyLength(1);

    render(<OrderCreateModal {...lists} api={acceptingApi} initial={draft} />);

    await user.click(screen.getByRole('button', { name: texts.add }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/orders'));
    expect(back).not.toHaveBeenCalled();
  });

  it('🔴 заполненная форма по Escape не закрывается молча — окно спрашивает', async () => {
    const user = userEvent.setup();

    render(<OrderCreateModal {...lists} api={acceptingApi} />);

    await user.type(screen.getByLabelText(texts.address), 'Тула, Пирогова, 12');
    await user.keyboard('{Escape}');

    /* Человек, потерявший заполненную форму случайным нажатием, второй раз её
       не заполнит — он позвонит (ADR-141). */
    expect(back).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Закрыть без сохранения' }));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('🔴 признак изменённости снимается изменением, а не полями формы', async () => {
    const user = userEvent.setup();

    render(<OrderCreateModal {...lists} api={acceptingApi} />);

    /* Спрашивает и про этаж, и про адрес: правило одно на всю форму, а не
       список «важных» полей, который разошёлся бы с ней на первой правке. */
    await user.type(screen.getByLabelText(texts.floor), '5');
    await user.keyboard('{Escape}');

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(back).not.toHaveBeenCalled();
  });

  it('🔴 первый же выбор монтажника не пропадает', async () => {
    const user = userEvent.setup();

    render(<OrderCreateModal {...lists} api={acceptingApi} />);

    const select = screen.getByLabelText(texts.installer);
    await user.selectOptions(select, selfEmployedInstaller.id);

    /* Окно слушает изменение, а не ввод. У `<select>` нативный `input`
       приходит раньше `change`: перерисовка от признака изменённости
       откатывала бы управляемый список, и первый выбор пропадал молча. */
    expect(select).toHaveValue(selfEmployedInstaller.id);

    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('пустая форма закрывается сразу — терять нечего', async () => {
    const user = userEvent.setup();

    render(<OrderCreateModal {...lists} api={acceptingApi} />);

    await user.keyboard('{Escape}');

    expect(back).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('черновик из обращения приходит подставленным, а окно подписано им', () => {
    render(
      <OrderCreateModal
        {...lists}
        api={acceptingApi}
        initial={draft}
        title="Черновик наряда"
        hint="Ирина Соколова · Монтаж и установка"
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Черновик наряда' })).toBeInTheDocument();
    expect(screen.getByLabelText(texts.address)).toHaveValue(draft.address);
  });

  it('🔴 всё под окном помечено inert: читалка не уходит гулять по списку', () => {
    const { baseElement } = render(<OrderCreateModal {...lists} api={acceptingApi} />);

    const covered = [...baseElement.children].filter(
      (node) => node.querySelector('[role="dialog"]') === null,
    );

    expect(covered.length).toBeGreaterThan(0);
    for (const node of covered) expect(node).toHaveAttribute('inert');
  });
});
