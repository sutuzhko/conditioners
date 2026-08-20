import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('связывает подпись с полем', () => {
    render(<Textarea label="Отзыв" />);
    expect(screen.getByLabelText('Отзыв')).toBeInTheDocument();
  });

  it('принимает многострочный ввод', async () => {
    const user = userEvent.setup();
    render(<Textarea label="Отзыв" />);

    await user.type(screen.getByLabelText('Отзыв'), 'Первая строка{Enter}Вторая');
    expect(screen.getByLabelText('Отзыв')).toHaveValue('Первая строка\nВторая');
  });

  it('ошибка помечает поле и озвучивается', () => {
    render(<Textarea label="Отзыв" error="Слишком коротко" />);

    expect(screen.getByLabelText('Отзыв')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Слишком коротко');
  });

  it('по умолчанию четыре строки — как в макете формы отзыва', () => {
    render(<Textarea label="Отзыв" />);
    expect(screen.getByLabelText('Отзыв')).toHaveAttribute('rows', '4');
  });
});
