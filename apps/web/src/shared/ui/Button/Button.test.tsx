import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('по умолчанию не отправляет форму — type=button', () => {
    render(<Button>Отправить</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('вызывает обработчик по клику и по Enter с клавиатуры', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Заказать</Button>);

    await user.tab();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Заказать' }));

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('в состоянии загрузки блокируется и помечается aria-busy', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button loading onClick={onClick}>
        Отправляем
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('подпись остаётся в разметке при загрузке — ширина кнопки не скачет', () => {
    render(<Button loading>Отправляем</Button>);
    expect(screen.getByRole('button', { name: 'Отправляем' })).toBeInTheDocument();
  });

  it('отключённая кнопка не реагирует на клик', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button disabled onClick={onClick}>
        Недоступно
      </Button>,
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('пробрасывает произвольные атрибуты кнопки', () => {
    render(<Button aria-label="Позвонить" name="call" />);
    expect(screen.getByRole('button', { name: 'Позвонить' })).toHaveAttribute('name', 'call');
  });
  it('акцентный вариант отличается от остальных — это отдельная заливка', () => {
    const accent = render(<Button variant="accent">Заказать</Button>).container.firstElementChild;
    const secondary = render(<Button variant="secondary">Заказать</Button>).container
      .firstElementChild;

    expect(accent?.className).not.toBe(secondary?.className);
  });
});
