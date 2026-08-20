import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chip } from './Chip';

describe('Chip', () => {
  it('сообщает состояние выбора через aria-pressed', () => {
    const { rerender } = render(<Chip>Офис</Chip>);
    expect(screen.getByRole('button', { name: 'Офис' })).toHaveAttribute('aria-pressed', 'false');

    rerender(<Chip selected>Офис</Chip>);
    expect(screen.getByRole('button', { name: 'Офис' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('выбирается кликом и пробелом', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Chip onClick={onClick}>Квартира</Chip>);

    await user.click(screen.getByRole('button'));
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('показывает счётчик рядом с подписью', () => {
    render(<Chip count={12}>Инверторные</Chip>);
    expect(screen.getByRole('button', { name: /Инверторные\s*12/ })).toBeInTheDocument();
  });

  it('отключённый чип не выбирается', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Chip disabled onClick={onClick}>
        Склад
      </Chip>,
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
