import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const options = [
  { value: 'a', label: 'Квартира' },
  { value: 'b', label: 'Офис' },
];

describe('Select', () => {
  it('рисует переданные варианты', () => {
    render(<Select label="Помещение" options={options} />);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('плейсхолдер стоит первым и недоступен для выбора', () => {
    render(<Select label="Помещение" options={options} placeholder="Выберите" defaultValue="" />);

    const first = screen.getAllByRole('option')[0];
    expect(first).toHaveTextContent('Выберите');
    expect(first).toBeDisabled();
  });

  it('выбор с клавиатуры меняет значение и зовёт обработчик', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Select label="Помещение" options={options} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Помещение'), 'b');
    expect(screen.getByLabelText('Помещение')).toHaveValue('b');
    expect(onChange).toHaveBeenCalled();
  });

  it('ошибка помечает поле невалидным', () => {
    render(<Select label="Помещение" options={options} error="Выберите помещение" />);
    expect(screen.getByLabelText('Помещение')).toHaveAttribute('aria-invalid', 'true');
  });

  it('пустой список не ломает поле', () => {
    render(<Select label="Помещение" options={[]} />);
    expect(screen.getByLabelText('Помещение')).toBeInTheDocument();
  });
});
