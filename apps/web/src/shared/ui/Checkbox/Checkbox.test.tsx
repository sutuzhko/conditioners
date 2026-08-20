import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('переключается кликом по метке', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Нужна штроба" />);

    await user.click(screen.getByText('Нужна штроба'));
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('переключается пробелом с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Нужна штроба" />);

    await user.tab();
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('ссылка внутри метки остаётся ссылкой и доступна с клавиатуры', async () => {
    const user = userEvent.setup();
    render(
      <Checkbox
        label={
          <>
            Принимаю <a href="/politika-konfidencialnosti">политику</a>
          </>
        }
      />,
    );

    const link = screen.getByRole('link', { name: 'политику' });
    expect(link).toHaveAttribute('href', '/politika-konfidencialnosti');

    // по спецификации HTML клик по интерактивному потомку метки не активирует
    // саму метку, поэтому проверяем главное: до ссылки можно дойти табом
    await user.tab();
    await user.tab();
    expect(link).toHaveFocus();
  });

  it('ошибка помечает флажок и озвучивается', () => {
    render(<Checkbox label="Согласие" error="Без согласия заявку принять нельзя" />);

    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Без согласия заявку принять нельзя');
  });

  it('отключённый флажок не переключается', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Согласие" disabled />);

    await user.click(screen.getByText('Согласие'));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
