import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AllDayBar } from './AllDayBar';
import { crmContent as texts } from './content';
import { manyLeads, monthLeads, vacationBlock, viewerId } from './fixtures';
import { dayColumns, weekColumns, type ScheduleColumn } from './schedule';

const DAY = '2026-08-23';

function day(leads: typeof monthLeads): readonly ScheduleColumn[] {
  return dayColumns({ events: [], orders: [], leads, blocks: [], viewerId, today: DAY }, DAY);
}

function bar(leads: typeof monthLeads) {
  render(<AllDayBar columns={day(leads)} />);
}

describe('Полоса «весь день»', () => {
  it('🔴 держит заявку с сайта: ей ещё не назначили время (ADR-128)', () => {
    bar(monthLeads);

    const list = screen.getByRole('list', { name: texts.allDay });

    expect(within(list).getAllByRole('button')).toHaveLength(1);
  });

  it('пока записей мало, сворачивать нечего', () => {
    bar(monthLeads);

    expect(screen.queryByRole('button', { name: /^Ещё / })).toBeNull();
  });

  it('🔴 день с восемью заявками не съедает сетку: полоса сворачивается', async () => {
    const user = userEvent.setup();
    bar(manyLeads);

    const toggle = screen.getByRole('button', { name: texts.moreEvents(6) });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);

    expect(screen.getByRole('button', { name: texts.close })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    // список остаётся на месте: сворачивается высота, а не содержимое
    expect(
      within(screen.getByRole('list', { name: texts.allDay })).getAllByRole('button'),
    ).toHaveLength(8);
  });

  /**
   * 🔴 Отпуск на две недели — одна запись (ADR-165), и в неделе он обязан быть
   * одной полосой через все колонки. Дефект, который ловит проверка: семь
   * отдельных чипов со словом «Отпуск» подряд читаются как семь разных
   * отлучек, а не как один отпуск.
   */
  it('🔴 многодневная отлучка идёт одной полосой через колонки недели', () => {
    const week = weekColumns(
      { events: [], orders: [], leads: [], blocks: [vacationBlock], viewerId, today: DAY },
      '2026-08-26',
    );

    render(<AllDayBar columns={week} />);

    const list = screen.getByRole('list', { name: texts.allDay });
    const bands = within(list).getAllByRole('listitem');

    expect(bands).toHaveLength(1);
    expect(bands[0]).toHaveStyle({ gridColumn: '1 / span 7' });
  });

  it('полоса занимает ровно свои колонки, а не всю неделю', () => {
    /* Неделя 17–23 августа: отпуск начинается в среду 19-го и уходит за
       правый край — три колонки до него остаются свободными. */
    const week = weekColumns(
      { events: [], orders: [], leads: [], blocks: [vacationBlock], viewerId, today: DAY },
      '2026-08-19',
    );

    render(<AllDayBar columns={week} />);

    const bands = within(screen.getByRole('list', { name: texts.allDay })).getAllByRole('listitem');

    expect(bands).toHaveLength(1);
    expect(bands[0]).toHaveStyle({ gridColumn: '3 / span 5' });
  });
});
