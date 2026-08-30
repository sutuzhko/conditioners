import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Badge } from './Badge';

describe('Badge', () => {
  it('рисует переданный текст', () => {
    render(<Badge>Инвертор</Badge>);
    expect(screen.getByText('Инвертор')).toBeInTheDocument();
  });

  it('плашка скидки остаётся обычным текстом для скринридера', () => {
    render(<Badge variant="sale">−12%</Badge>);
    expect(screen.getByText('−12%')).toBeVisible();
  });

  /* 🔴 По умолчанию плашка не переносится: «Класс 09», сломанный пополам,
     читается как ошибка вёрстки. Но там, где текст приходит из настроек, длину
     задаёт владелец, и плашка обязана переносить строку (ADR-126). */
  it('плашка с текстом из настроек переносит строку, обычная — нет', () => {
    const { container: plain } = render(<Badge>Тула и область — выезд в день обращения</Badge>);
    const { container: wrapped } = render(
      <Badge wrap>Тула и область — выезд в день обращения</Badge>,
    );

    expect(wrapped.firstElementChild?.className).not.toBe(plain.firstElementChild?.className);
  });

  it('пробрасывает атрибуты доступности', () => {
    render(
      <Badge role="status" aria-label="Скидка двенадцать процентов">
        −12%
      </Badge>,
    );
    expect(screen.getByRole('status')).toHaveAccessibleName('Скидка двенадцать процентов');
  });
});

describe('Плашка статуса', () => {
  /* 🔴 Точка декоративна: смысл несёт подпись. Озвучка, прочитавшая «точка
     Выполнен», сообщает лишнее, а на чёрно-белой печати наряда точка совпадает
     у всех шести красок. */
  it('точка скрыта от озвучки, а подпись остаётся на месте', () => {
    const { container } = render(
      <Badge variant="success" dot>
        Выполнен
      </Badge>,
    );

    expect(screen.getByText('Выполнен')).toBeVisible();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(container.firstElementChild).toHaveTextContent('Выполнен');
  });

  it('шесть красок словаря дают шесть разных классов', () => {
    const colours = ['neutral', 'accent', 'warning', 'success', 'danger', 'info'] as const;
    const classes = colours.map(
      (variant) =>
        render(<Badge variant={variant}>Статус</Badge>).container.firstElementChild?.className,
    );

    expect(new Set(classes).size).toBe(colours.length);
  });

  /* 🔴 Крестик — настоящая кнопка со своим именем: цель 12×12 без имени
     озвучка называет «плашка», и снять фильтр с клавиатуры нельзя вовсе. */
  it('крестик снятия — кнопка с именем, доступная с клавиатуры', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <Badge variant="accent" onRemove={onRemove} removeLabel="Убрать фильтр: монтаж">
        Монтаж
      </Badge>,
    );

    const remove = screen.getByRole('button', { name: 'Убрать фильтр: монтаж' });
    await user.tab();
    expect(remove).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('без обработчика снятия кнопки в плашке нет', () => {
    render(<Badge variant="accent">Монтаж</Badge>);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
