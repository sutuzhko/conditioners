import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from './Drawer';

const open = (props: Partial<Parameters<typeof Drawer>[0]> = {}) =>
  render(
    <Drawer open onClose={props.onClose ?? (() => {})} title="Меню" {...props}>
      <nav aria-label="Основная навигация">
        <a href="/katalog">Каталог</a>
        <a href="/ceny">Цены</a>
      </nav>
    </Drawer>,
  );

describe('Drawer', () => {
  it('закрытая панель не попадает в разметку', () => {
    render(
      <Drawer open={false} onClose={() => {}} title="Меню">
        <a href="/katalog">Каталог</a>
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('имя панели берётся из заголовка', () => {
    open();
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Меню');
  });

  it('без заголовка имя берётся из label', () => {
    open({ title: undefined, label: 'Меню сайта' });
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Меню сайта');
  });

  it('закрывается по Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    open({ onClose });

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('закрывается кликом по подложке', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    open({ onClose });

    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay !== null) await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('закрывается кнопкой', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    open({ onClose });

    await user.click(screen.getByRole('button', { name: 'Закрыть меню' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('навигация внутри доступна с клавиатуры и фокус не уходит наружу', async () => {
    const user = userEvent.setup();
    open();

    const dialog = screen.getByRole('dialog');
    await user.tab();
    await user.tab();
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('прокрутка страницы блокируется, пока меню открыто', () => {
    const { unmount } = open();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
