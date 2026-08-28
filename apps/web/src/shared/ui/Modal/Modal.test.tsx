import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

const open = (props: Partial<Parameters<typeof Modal>[0]> = {}) =>
  render(
    <Modal open onClose={props.onClose ?? (() => {})} title="Заявка принята" {...props}>
      <p>Перезвоним в течение 15 минут</p>
    </Modal>,
  );

describe('Modal', () => {
  it('закрытое окно не попадает в разметку', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Заявка принята">
        <p>Текст</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('имеет доступное имя из заголовка', () => {
    open();
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Заявка принята');
  });

  it('пояснение попадает в описание окна', () => {
    open({ description: 'Номер заявки 128' });
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Номер заявки 128');
  });

  it('закрывается по Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    open({ onClose });

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('закрывается кликом по подложке, но не по самому окну', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    open({ onClose });

    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay !== null) await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('закрывается кнопкой в шапке', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    open({ onClose });

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('фокус уходит внутрь окна при открытии', () => {
    open();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  /**
   * 🔴 Человек с клавиатуры, закрыв окно, обязан вернуться туда, откуда его
   * открыл. Иначе он оказывается в начале страницы и заново идёт табом до
   * нужной кнопки — а на странице панели их десятки.
   *
   * Ломалось порядком очисток: возврат фокуса стоял в эффекте выше снятия
   * `inert` с фона, а `focus()` внутри `inert`-поддерева браузер игнорирует.
   * Молча: окно закрывалось, ошибок не было, фокус просто уходил на `body`.
   */
  it('после закрытия фокус возвращается на открывшую кнопку', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Открыть';
    document.body.append(opener);
    opener.focus();

    const view = render(
      <Modal open onClose={() => {}} title="Заявка принята">
        <p>Текст</p>
      </Modal>,
    );

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

    view.rerender(
      <Modal open={false} onClose={() => {}} title="Заявка принята">
        <p>Текст</p>
      </Modal>,
    );

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('Tab не уводит фокус за пределы окна', async () => {
    const user = userEvent.setup();
    open();

    const dialog = screen.getByRole('dialog');
    await user.tab();
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('прокрутка страницы блокируется, пока окно открыто', () => {
    const { unmount } = open();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('фон помечен inert, а само окно — нет; закрытие снимает пометку', () => {
    // страница под окном: без inert виртуальный курсор читалки уходил бы в неё
    const page = document.createElement('p');
    page.textContent = 'Контент страницы';
    document.body.append(page);

    const { unmount } = open();

    expect(page).toHaveAttribute('inert');
    // корень портала — прямой ребёнок body, внутри которого живёт окно
    expect(screen.getByRole('dialog').parentElement).not.toHaveAttribute('inert');

    unmount();
    expect(page).not.toHaveAttribute('inert');
    page.remove();
  });

  it('чужой inert закрытие не трогает: снимается только своя пометка', () => {
    const parked = document.createElement('div');
    parked.setAttribute('inert', '');
    document.body.append(parked);

    const { unmount } = open();
    unmount();

    expect(parked).toHaveAttribute('inert');
    parked.remove();
  });
});
