import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table } from './Table';

/**
 * 🔴 Останов табуляции у области прокрутки ставится по замеру, а не всегда
 * (`TableScroller`): в jsdom ширины нулевые, и без подмены ни одна таблица не
 * считается прокручиваемой. Подменяем геометрию — тогда видно оба состояния,
 * а не одно.
 */
function pretendScrollable(): void {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(900);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
}

afterEach(() => {
  vi.restoreAllMocks();
});

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
    pretendScrollable();

    render(
      <Table variant="sticky" label="Сравнение моделей">
        {body}
      </Table>,
    );

    const region = screen.getByRole('region', { name: 'Сравнение моделей' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  /**
   * 🔴 Пока прокручивать нечего, останова табуляции нет (issue #602). Он стоял
   * всегда, и на телефоне, где строки разложены карточками, обход клавиатурой
   * упирался в контейнер высотой во весь список: фокус оказывался за пределами
   * окна — элемент выше экрана в него целиком не помещается.
   *
   * Имя и роль при этом остаются: по ним область находят озвучка и сценарии.
   */
  it('🔴 непрокручиваемая область остаётся именованной, но останова не даёт', () => {
    render(
      <Table variant="cards" label="Список клиентов">
        {body}
      </Table>,
    );

    const region = screen.getByRole('region', { name: 'Список клиентов' });
    expect(region).not.toHaveAttribute('tabindex');
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
    pretendScrollable();

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
    pretendScrollable();

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
