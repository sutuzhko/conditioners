import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from './Switch';

describe('Переключатель', () => {
  /* 🔴 Роль `switch`, а не `checkbox`: озвучка тогда говорит «включено», а не
     «отмечено». Разница смысловая — галочка это согласие, которое уедет с
     формой, а переключатель это состояние, действующее сразу. */
  it('объявляется переключателем, а не галочкой', () => {
    render(<Switch label="Активен" />);

    expect(screen.getByRole('switch', { name: 'Активен' })).toBeInTheDocument();
  });

  it('переключается пробелом с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<Switch label="Активен" />);

    await user.tab();
    expect(screen.getByRole('switch')).toHaveFocus();

    await user.keyboard(' ');
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('нажатие на подпись переключает — подпись связана через htmlFor', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch label="Не работает" onChange={onChange} />);

    await user.click(screen.getByText('Не работает'));
    expect(onChange).toHaveBeenCalled();
  });

  it('отключённый не принимает фокус', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Switch label="Активен" disabled />
        <button type="button">Дальше</button>
      </>,
    );

    await user.tab();
    expect(screen.getByRole('button', { name: 'Дальше' })).toHaveFocus();
  });

  it('ошибка объявляется текстом и связывается с контролом', () => {
    render(<Switch label="Активен" error="Нельзя выключить последнего владельца" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Нельзя выключить последнего владельца');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-invalid', 'true');
  });

  it('подсказка связывается через aria-describedby', () => {
    render(<Switch label="Активен" hint="Выключенный монтажник не получает наряды" />);

    const control = screen.getByRole('switch');
    const described = control.getAttribute('aria-describedby');
    expect(described).not.toBeNull();
    expect(screen.getByText('Выключенный монтажник не получает наряды').id).toBe(described);
  });
});
