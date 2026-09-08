import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { useConfirm } from '../ConfirmDialog/useConfirm';
import { useLeaveGuard } from './useLeaveGuard';

const REQUEST = {
  title: 'Уйти, не сохранив правки?',
  confirmLabel: 'Уйти без сохранения',
  cancelLabel: 'Остаться',
} as const;

/**
 * Страница с формой и ссылками рядом — так устроена панель: оболочка с
 * навигацией снаружи, форма внутри.
 *
 * Переход гасится обработчиком ссылки: jsdom по-настоящему ходить не умеет, а
 * проверяется здесь не переход, а то, дошло ли нажатие до ссылки. Обработчик
 * висит на всплытии и до перехвата в фазе погружения не доходит.
 */
function Page({ dirty, onLeave }: { readonly dirty: boolean; readonly onLeave: () => void }) {
  const { confirm, dialog } = useConfirm();
  useLeaveGuard({ when: dirty, confirm, request: REQUEST });

  const hold = (event: { preventDefault: () => void }): void => {
    event.preventDefault();
    onLeave();
  };

  return (
    <div>
      <a href="/admin/leads" onClick={hold}>
        Заявки
      </a>
      <a href="#legal" onClick={hold}>
        Реквизиты
      </a>
      <a href="https://example.org/docs" onClick={hold}>
        Инструкция
      </a>
      {dialog}
    </div>
  );
}

describe('useLeaveGuard', () => {
  it('терять нечего — ссылка открывается без вопроса', async () => {
    const onLeave = vi.fn();
    render(<Page dirty={false} onLeave={onLeave} />);

    await userEvent.click(screen.getByRole('link', { name: 'Заявки' }));

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('🔴 уход с несохранёнными правками спрашивает, а не уводит молча (issue #32)', async () => {
    const onLeave = vi.fn();
    render(<Page dirty onLeave={onLeave} />);

    await userEvent.click(screen.getByRole('link', { name: 'Заявки' }));

    expect(await screen.findByRole('dialog', { name: REQUEST.title })).toBeInTheDocument();
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('«Остаться» оставляет на странице', async () => {
    const onLeave = vi.fn();
    render(<Page dirty onLeave={onLeave} />);

    await userEvent.click(screen.getByRole('link', { name: 'Заявки' }));
    await userEvent.click(await screen.findByRole('button', { name: REQUEST.cancelLabel }));

    expect(onLeave).not.toHaveBeenCalled();
  });

  it('🔴 согласились — ссылка открывается той же ссылкой, а не своим переходом', async () => {
    const onLeave = vi.fn();
    render(<Page dirty onLeave={onLeave} />);

    await userEvent.click(screen.getByRole('link', { name: 'Заявки' }));
    await userEvent.click(await screen.findByRole('button', { name: REQUEST.confirmLabel }));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('🔴 якорь той же страницы уходом не считается: оглавление формы из них и состоит', async () => {
    const onLeave = vi.fn();
    render(<Page dirty onLeave={onLeave} />);

    await userEvent.click(screen.getByRole('link', { name: 'Реквизиты' }));

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('чужой адрес уводит из вкладки, а не со страницы — его держит браузер', async () => {
    const onLeave = vi.fn();
    render(<Page dirty onLeave={onLeave} />);

    await userEvent.click(screen.getByRole('link', { name: 'Инструкция' }));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('открытие в соседней вкладке не трогает форму', async () => {
    const onLeave = vi.fn();
    /* Зажатая клавиша живёт внутри одной сессии ввода, а не между вызовами. */
    const user = userEvent.setup();
    render(<Page dirty onLeave={onLeave} />);

    await user.keyboard('{Meta>}');
    await user.click(screen.getByRole('link', { name: 'Заявки' }));
    await user.keyboard('{/Meta}');

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('🔴 закрытие вкладки останавливается браузером: своего окна тут нет', () => {
    const { rerender } = render(<Page dirty={false} onLeave={vi.fn()} />);

    const quiet = new Event('beforeunload', { cancelable: true });
    globalThis.dispatchEvent(quiet);
    expect(quiet.defaultPrevented).toBe(false);

    rerender(<Page dirty onLeave={vi.fn()} />);

    const asked = new Event('beforeunload', { cancelable: true });
    globalThis.dispatchEvent(asked);
    /* Отменённое событие и есть просьба к браузеру спросить. Текст его окна
       задать нельзя — этим уход по ссылке и уход из вкладки различаются. */
    expect(asked.defaultPrevented).toBe(true);
  });

  it('правки сохранили — слушатели снимаются', async () => {
    const onLeave = vi.fn();
    const { rerender } = render(<Page dirty onLeave={onLeave} />);
    rerender(<Page dirty={false} onLeave={onLeave} />);

    await userEvent.click(screen.getByRole('link', { name: 'Заявки' }));

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
