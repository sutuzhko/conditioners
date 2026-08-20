import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table } from './Table';

const body = (
  <tbody>
    <tr>
      <th scope="row">Класс 09</th>
      <td>2,6 кВт</td>
    </tr>
  </tbody>
);

describe('Table', () => {
  it('рисует обычную таблицу без области прокрутки', () => {
    render(<Table>{body}</Table>);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('в варианте со скроллом даёт именованную область, доступную с клавиатуры', () => {
    render(
      <Table variant="sticky" label="Сравнение моделей">
        {body}
      </Table>,
    );

    const region = screen.getByRole('region', { name: 'Сравнение моделей' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('подпись таблицы попадает в caption', () => {
    render(<Table caption="Цены с монтажом">{body}</Table>);
    expect(screen.getByRole('table')).toHaveAccessibleName('Цены с монтажом');
  });

  it('минимальная ширина задаётся снаружи — она зависит от числа колонок', () => {
    render(
      <Table variant="scroll" minWidth="760px" label="Прайс">
        {body}
      </Table>,
    );
    expect(screen.getByRole('table')).toHaveStyle({ minWidth: '760px' });
  });

  it('заголовки строк остаются заголовками', () => {
    render(<Table>{body}</Table>);
    expect(screen.getByRole('rowheader', { name: 'Класс 09' })).toBeInTheDocument();
  });
});
