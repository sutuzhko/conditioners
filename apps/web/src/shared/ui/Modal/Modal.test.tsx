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
});
