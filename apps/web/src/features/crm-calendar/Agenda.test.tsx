import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Agenda } from './Agenda';
import { crmContent as texts } from './content';
import { dayLead, monthEvents, monthLeads, monthOrders, plannedCall, viewerId } from './fixtures';
import { weekColumns, type ScheduleSource } from './schedule';

/** 23 августа 2026 — воскресенье; его неделя начинается 17-го. */
const DAY = '2026-08-23';

function source(patch: Partial<ScheduleSource> = {}): ScheduleSource {
  return {
    events: monthEvents,
    orders: monthOrders,
    leads: monthLeads,
    blocks: [],
    viewerId,
    today: DAY,
    ...patch,
  };
}

function agenda(patch: Partial<ScheduleSource> = {}) {
  render(<Agenda columns={weekColumns(source(patch), DAY)} />);

  return screen.getByRole('region', { name: texts.agendaLabel });
}

describe('Повестка недели', () => {
  it('🔴 показывает дни списком, а не колонками: семь колонок на телефоне нечитаемы', () => {
    const list = agenda();

    /* На неделе 17–23 августа заняты два дня: замер 21-го и звонок с монтажом
       23-го. Пустые дни в повестку не попадают — она отвечает на «что на
       неделе», а не «сколько в ней дней». */
    expect(within(list).getAllByRole('link', { name: /открыть день/ })).toHaveLength(2);
  });

  it('день ведёт туда, где есть часы', () => {
    const list = agenda();

    expect(within(list).getByRole('link', { name: /^23 августа/ })).toHaveAttribute(
      'href',
      `/admin/crm?view=day&day=${DAY}`,
    );
  });

  it('внутри дня сначала записи без часа, потом по времени', () => {
    const list = agenda({ orders: [], events: [plannedCall] });
    const buttons = within(list).getAllByRole('button');

    expect(buttons[0]).toHaveAccessibleName(expect.stringContaining(dayLead.name));
    expect(buttons[1]).toHaveAccessibleName(expect.stringContaining(plannedCall.clientName));
  });

  it('пустая неделя объясняет, что делать, а не молчит', () => {
    render(<Agenda columns={weekColumns(source({ events: [], orders: [], leads: [] }), DAY)} />);

    expect(screen.getByText(texts.agendaEmpty)).toBeInTheDocument();
    expect(screen.getByText(texts.agendaEmptyHint)).toBeInTheDocument();
  });
});
