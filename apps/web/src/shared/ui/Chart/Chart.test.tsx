import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Chart } from './Chart';

const ORDERS = { id: 'orders', name: 'Заказы', points: [12, 18, 15, 24] };
const REVENUE = { id: 'revenue', name: 'Выплаты', points: [8, 11, 9, 16] };
const LABELS = ['32 нед', '33 нед', '34 нед', '35 нед'];

describe('График', () => {
  /* 🔴 `role="img"` без имени озвучка называет «изображение» и не говорит,
     что показано. Имя обязано называть и график, и числа. */
  it('называет себя и свои числа для озвучки', () => {
    render(<Chart series={[ORDERS]} labels={LABELS} title="Заказы по неделям" />);

    const figure = screen.getByRole('img');
    const name = figure.getAttribute('aria-label') ?? '';

    expect(name).toContain('Заказы по неделям');
    expect(name).toContain('12');
    expect(name).toContain('24');
  });

  it('легенда есть, когда серий две', () => {
    render(<Chart series={[ORDERS, REVENUE]} labels={LABELS} title="Заказы и выплаты" />);

    expect(screen.getByText('Заказы')).toBeInTheDocument();
    expect(screen.getByText('Выплаты')).toBeInTheDocument();
  });

  it('легенды нет, когда серия одна — сверять не с чем', () => {
    render(<Chart series={[ORDERS]} labels={LABELS} title="Заказы по неделям" />);

    expect(screen.queryByText('Выплаты')).not.toBeInTheDocument();
  });

  /* 🔴 Вторая серия различается штрихом, а не только цветом: пара разведена по
     тону, но не по светлоте (1,36:1 и 1,08:1), и при нарушениях
     цветовосприятия и на чёрно-белой печати наряда линии сольются. */
  it('вторая линия идёт своим классом со штрихом', () => {
    const { container } = render(
      <Chart series={[ORDERS, REVENUE]} labels={LABELS} title="Заказы и выплаты" />,
    );

    const lines = container.querySelectorAll('path');
    expect(lines).toHaveLength(2);
    expect(lines[0]?.getAttribute('class')).toContain('line1');
    expect(lines[1]?.getAttribute('class')).toContain('line2');
  });

  /* Подпись конца ищется по классу, а не по тексту: верхняя отметка шкалы
     равна максимуму ряда и набирается тем же форматом — «24 шт» на экране
     действительно два, и это не ошибка. */
  it('на конце каждой линии стоит подпись значения', () => {
    const { container } = render(
      <Chart
        series={[ORDERS, REVENUE]}
        labels={LABELS}
        title="Заказы и выплаты"
        format={(value) => `${value} шт`}
      />,
    );

    const ends = [...container.querySelectorAll('text')].filter((node) =>
      (node.getAttribute('class') ?? '').includes('value'),
    );

    expect(ends.map((node) => node.textContent)).toEqual(['24 шт', '16 шт']);
  });

  it('подписи делений подписаны по горизонтали', () => {
    render(<Chart series={[ORDERS]} labels={LABELS} title="Заказы по неделям" />);

    for (const label of LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  /* 🔴 График не должен вылезать за карточку: ширина 100%, высота из viewBox. */
  it('тянется по ширине через viewBox, а не фиксированными размерами', () => {
    const { container } = render(
      <Chart series={[ORDERS]} labels={LABELS} title="Заказы по неделям" />,
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
    expect(svg).not.toHaveAttribute('width');
  });

  it('пустая серия не роняет график', () => {
    render(
      <Chart series={[{ id: 'empty', name: 'Заказы', points: [] }]} labels={[]} title="Заказы" />,
    );

    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
