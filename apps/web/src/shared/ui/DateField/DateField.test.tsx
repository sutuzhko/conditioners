import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import {
  DateField,
  EMPTY_DATE,
  dateSegmentsOf,
  isoOfDateSegments,
  type DateSegments,
} from './DateField';

/** Поле управляемое: обёртка держит значение, как это делает форма наряда. */
function Harness({ initial = EMPTY_DATE }: { initial?: DateSegments }) {
  const [value, setValue] = useState<DateSegments>(initial);
  return <DateField label="Дата выезда" value={value} onChange={setValue} />;
}

describe('Поле даты сегментами', () => {
  it('сегменты названы по отдельности, а поле целиком — группой', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Дата выезда' })).toBeInTheDocument();
    expect(screen.getByLabelText('День')).toBeInTheDocument();
    expect(screen.getByLabelText('Месяц')).toBeInTheDocument();
    expect(screen.getByLabelText('Год')).toBeInTheDocument();
  });

  /* 🔴 Порядок задан кодом, а не локалью системы: на машине с английской
     локалью нативный `input[type=date]` показал бы месяц перед днём. */
  it('порядок сегментов российский — день, месяц, год', () => {
    const { container } = render(<Harness />);
    const labels = [...container.querySelectorAll('input')].map((input) =>
      input.getAttribute('aria-label'),
    );

    expect(labels).toEqual(['День', 'Месяц', 'Год']);
  });

  it('заполненный сегмент передаёт фокус следующему сам', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText('День'));
    await user.keyboard('01');

    expect(screen.getByLabelText('Месяц')).toHaveFocus();
  });

  it('стрелка вверх увеличивает сегмент', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ day: '01', month: '09', year: '2026' }} />);

    await user.click(screen.getByLabelText('День'));
    await user.keyboard('{ArrowUp}');

    expect(screen.getByLabelText('День')).toHaveValue('02');
  });

  it('стрелка вниз переносит через нижнюю границу на верхнюю', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ day: '01', month: '09', year: '2026' }} />);

    await user.click(screen.getByLabelText('День'));
    await user.keyboard('{ArrowDown}');

    expect(screen.getByLabelText('День')).toHaveValue('31');
  });

  it('месяц не выходит за двенадцать', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ day: '01', month: '12', year: '2026' }} />);

    await user.click(screen.getByLabelText('Месяц'));
    await user.keyboard('{ArrowUp}');

    expect(screen.getByLabelText('Месяц')).toHaveValue('01');
  });

  it('Backspace в пустом сегменте возвращает в предыдущий', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ day: '01', month: '', year: '' }} />);

    await user.click(screen.getByLabelText('Месяц'));
    await user.keyboard('{Backspace}');

    expect(screen.getByLabelText('День')).toHaveFocus();
  });

  it('буквы в сегмент не попадают', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText('День'));
    await user.keyboard('ab');

    expect(screen.getByLabelText('День')).toHaveValue('');
  });

  it('ни один сегмент не использует tabindex больше нуля', () => {
    const { container } = render(<Harness />);

    for (const input of container.querySelectorAll('input')) {
      expect(input).not.toHaveAttribute('tabindex');
    }
  });
});

describe('дата поля и дата хранения — одно и то же значение', () => {
  it('ISO-день разбирается в сегменты в российском порядке', () => {
    expect(dateSegmentsOf('2026-09-10')).toEqual({ day: '10', month: '09', year: '2026' });
  });

  /* 🔴 Гадать за владельца, какой день он имел в виду, поле не должно: пустая
     и неразобранная строка дают пустое поле, а не «сегодня». */
  it('пустая и битая строка дают пустое поле', () => {
    expect(dateSegmentsOf('')).toEqual(EMPTY_DATE);
    expect(dateSegmentsOf('10.09.2026')).toEqual(EMPTY_DATE);
    expect(dateSegmentsOf('2026-9-1')).toEqual(EMPTY_DATE);
  });

  it('сегменты собираются обратно в ISO-день', () => {
    expect(isoOfDateSegments({ day: '1', month: '9', year: '2026' })).toBe('2026-09-01');
  });

  /* 🔴 «10.09.» — не дата: половина значения на сервер не уходит, потому что
     пустое поле он уже умеет назвать ошибкой, а `2026-09-` не разберёт. */
  it('неполная дата даёт пустую строку, а не половину значения', () => {
    expect(isoOfDateSegments({ day: '10', month: '09', year: '' })).toBe('');
    expect(isoOfDateSegments({ day: '10', month: '', year: '2026' })).toBe('');
    expect(isoOfDateSegments({ day: '10', month: '09', year: '20' })).toBe('');
  });

  it('разбор и сборка возвращают то же значение', () => {
    expect(isoOfDateSegments(dateSegmentsOf('2026-09-10'))).toBe('2026-09-10');
  });
});
