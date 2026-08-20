import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('подпись связана с полем — клик по ней ставит фокус', async () => {
    const user = userEvent.setup();
    render(<Input label="Телефон" />);

    await user.click(screen.getByText('Телефон'));
    expect(screen.getByLabelText('Телефон')).toHaveFocus();
  });

  it('принимает ввод с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<Input label="Имя" />);

    await user.type(screen.getByLabelText('Имя'), 'Пётр');
    expect(screen.getByLabelText('Имя')).toHaveValue('Пётр');
  });

  it('ошибка помечает поле как невалидное и связывается через aria-describedby', () => {
    render(<Input label="Телефон" error="Введите номер полностью" />);

    const input = screen.getByLabelText('Телефон');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Введите номер полностью');
    expect(screen.getByRole('alert')).toHaveTextContent('Введите номер полностью');
  });

  it('подсказка и ошибка описывают поле одновременно', () => {
    render(<Input label="Телефон" hint="Только для звонка" error="Номер короткий" />);
    expect(screen.getByLabelText('Телефон')).toHaveAccessibleDescription(
      'Только для звонка Номер короткий',
    );
  });

  it('отключённое поле не принимает ввод', async () => {
    const user = userEvent.setup();
    render(<Input label="Имя" disabled />);

    await user.type(screen.getByLabelText('Имя'), 'Пётр');
    expect(screen.getByLabelText('Имя')).toHaveValue('');
  });

  it('обязательность отражается и в разметке, и в подписи', () => {
    render(<Input label="Телефон" required />);
    expect(screen.getByLabelText(/Телефон/)).toBeRequired();
  });
});
