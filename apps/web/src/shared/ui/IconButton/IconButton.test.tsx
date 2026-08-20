import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from './IconButton';

const icon = <svg viewBox="0 0 24 24" />;

describe('IconButton', () => {
  it('получает доступное имя из label', () => {
    render(<IconButton label="Открыть меню" icon={icon} />);
    expect(screen.getByRole('button', { name: 'Открыть меню' })).toBeInTheDocument();
  });

  it('иконка скрыта от скринридера', () => {
    render(<IconButton label="Закрыть" icon={icon} />);
    const button = screen.getByRole('button');
    expect(button.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('срабатывает с клавиатуры', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<IconButton label="Сменить тему" icon={icon} onClick={onClick} />);

    await user.tab();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('отключённая кнопка не реагирует', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<IconButton label="Назад" icon={icon} disabled onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
