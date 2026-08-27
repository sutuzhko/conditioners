import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AllDayBar } from './AllDayBar';
import { crmContent as texts } from './content';
import { manyLeads, monthLeads, viewerId } from './fixtures';
import { dayColumns, type ScheduleItem } from './schedule';

const DAY = '2026-08-23';

function itemsOf(leads: typeof monthLeads): readonly ScheduleItem[] {
  const column = dayColumns(
    { events: [], orders: [], leads, blocks: [], viewerId, today: DAY },
    DAY,
  )[0];

  return column?.allDay ?? [];
}

function bar(leads: typeof monthLeads) {
  render(
    <AllDayBar
      columns={[{ key: DAY, items: itemsOf(leads) }]}
      template="var(--cal-rail) minmax(0, 1fr)"
    />,
  );
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
});
