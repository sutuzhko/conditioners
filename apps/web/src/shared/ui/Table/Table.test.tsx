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

  it('карточный режим заворачивает таблицу в прокручиваемую область', () => {
    render(
      <Table variant="cards" label="Каталог">
        {body}
      </Table>,
    );

    /* 🔴 Карточками строки лежат только на узком экране. Выше порога это
       обычная таблица, и без своего контейнера прокрутки она уезжала за край
       документа — каталог панели вставал правым краем на 997 при ширине 900
       (issue #302). Область именована и доступна с клавиатуры: прокрутить её
       вбок должно быть можно не только пальцем. */
    const region = screen.getByRole('region', { name: 'Каталог' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(screen.getByRole('table'));
  });

  it('карточный режим сохраняет роль таблицы — её снимает display: block', () => {
    render(<Table variant="cards">{body}</Table>);

    expect(screen.getByRole('table')).toHaveAttribute('role', 'table');
  });

  /* 🔴 Липкая шапка без предела высоты не липнет ни к чему: контейнер
     горизонтальной прокрутки становится скроллером по обеим осям, а прокручивать
     в нём по вертикали нечего, пока его высота равна высоте таблицы. Поэтому
     `stickyHead` обязан заводить свою прокручиваемую область (issue #329). */
  it('липкая шапка заводит прокручиваемую область с пределом высоты', () => {
    render(
      <Table stickyHead label="Наряды">
        {body}
      </Table>,
    );

    const region = screen.getByRole('region', { name: 'Наряды' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(screen.getByRole('table'));
  });

  it('предел высоты области переопределяется снаружи', () => {
    render(
      <Table stickyHead maxHeight="420px" label="Наряды">
        {body}
      </Table>,
    );

    expect(screen.getByRole('region', { name: 'Наряды' })).toHaveStyle({ maxBlockSize: '420px' });
  });
});
