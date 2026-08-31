import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NumberInput } from './NumberInput';

describe('Числовое поле с шагом', () => {
  it('подпись связана с полем', () => {
    render(<NumberInput label="Трасса" value={4} onValueChange={() => {}} />);

    expect(screen.getByLabelText(/Трасса/)).toBeInTheDocument();
  });

  /* 🔴 Кнопки шага — настоящие кнопки со своими именами. Нативные стрелки
     `input[type=number]` на телефоне не показываются вовсе, мышью в них не
     попасть, и озвучка их не называет. */
  it('кнопки шага названы для озвучки', () => {
    render(<NumberInput label="Трасса" value={4} onValueChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Увеличить' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Уменьшить' })).toBeInTheDocument();
  });

  it('шаг вверх прибавляет заданный шаг, а не единицу', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<NumberInput label="Трасса" value={4} step={0.5} onValueChange={onValueChange} />);
    await user.click(screen.getByRole('button', { name: 'Увеличить' }));

    expect(onValueChange).toHaveBeenCalledWith(4.5);
  });

  it('шаг не выводит значение за границы', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<NumberInput label="Трасса" value={1} min={1} max={20} onValueChange={onValueChange} />);

    /* На нижней границе кнопка гаснет — она не исчезает, чтобы соседняя не
       уехала под палец. */
    expect(screen.getByRole('button', { name: 'Уменьшить' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Увеличить' }));
    expect(onValueChange).toHaveBeenCalledWith(2);
  });

  it('пустое поле отдаёт null, а не ноль — это разные вещи', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<NumberInput label="Трасса" value={4} onValueChange={onValueChange} />);
    await user.clear(screen.getByLabelText(/Трасса/));

    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  /* 🔴 Кнопки не участвуют в табуляции: с клавиатуры шаг делается стрелками на
     самом поле, а две лишние остановки на каждое число в форме расхода — это
     десятки лишних нажатий на пути к «Сохранить». */
  it('кнопки шага не добавляют остановок табуляции', async () => {
    const user = userEvent.setup();
    render(
      <>
        <NumberInput label="Трасса" value={4} onValueChange={() => {}} />
        <button type="button">Дальше</button>
      </>,
    );

    await user.tab();
    expect(screen.getByLabelText(/Трасса/)).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Дальше' })).toHaveFocus();
  });

  it('ошибка объявляется текстом и связывается с полем', () => {
    render(
      <NumberInput
        label="Трасса"
        value={0}
        onValueChange={() => {}}
        error="Длина трассы не может быть нулевой"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Длина трассы не может быть нулевой');
    expect(screen.getByLabelText(/Трасса/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('отключённое поле гасит и кнопки шага', () => {
    render(<NumberInput label="Трасса" value={4} onValueChange={() => {}} disabled />);

    expect(screen.getByRole('button', { name: 'Увеличить' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Уменьшить' })).toBeDisabled();
  });
});
