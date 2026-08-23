import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CalendarGrid } from './CalendarGrid';
import { monthEvents, monthLeads } from './fixtures';

function grid() {
  return render(
    <CalendarGrid
      month="2026-08"
      selected="2026-08-23"
      today="2026-08-23"
      events={monthEvents}
      leads={monthLeads}
    />,
  );
}

describe('Сетка месяца', () => {
  it('показывает шесть недель — сетка не прыгает по высоте между месяцами', () => {
    grid();

    expect(screen.getAllByRole('link')).toHaveLength(42);
  });

  it('день соседнего месяца остаётся ссылкой: дела из хвоста тоже открываются', () => {
    grid();

    expect(screen.getByRole('link', { name: /27 июля 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /6 сентября 2026/ })).toBeInTheDocument();
  });

  it('ссылка дня несёт и месяц: возврат по ней показывает тот же экран', () => {
    grid();

    expect(screen.getByRole('link', { name: /21 августа 2026/ })).toHaveAttribute(
      'href',
      '/admin/crm?month=2026-08&day=2026-08-21',
    );
  });

  it('называет дату и содержимое дня — числа в ячейке скринридеру ни о чём не говорят', () => {
    grid();

    expect(screen.getByRole('link', { name: '23 августа 2026, дел: 2, заявок: 1' })).toBeTruthy();
  });

  it('помечает выбранный день', () => {
    grid();

    expect(screen.getByRole('link', { name: /23 августа 2026/ })).toHaveAttribute(
      'aria-current',
      'date',
    );
  });

  it('показывает время и клиента в ячейке — день видно, не открывая его', () => {
    grid();

    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('Ирина')).toBeInTheDocument();
    expect(screen.getByText('13:30')).toBeInTheDocument();
  });

  it('считает дела в московском времени, а не в UTC', () => {
    // 21 августа 06:00 UTC — это 09:00 в Туле, тот же день
    grid();

    expect(screen.getByRole('link', { name: '21 августа 2026, дел: 1' })).toBeTruthy();
  });
});
