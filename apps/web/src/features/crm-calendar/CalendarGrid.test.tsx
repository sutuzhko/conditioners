import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CalendarGrid } from './CalendarGrid';
import { crmContent as texts } from './content';
import {
  dmitry,
  doctorBlock,
  installers,
  monthEvents,
  monthLeads,
  monthOrders,
  morningInstall,
  plannedCall,
  viewerId,
  wholeDayBlock,
} from './fixtures';
import { monthColumns, type ScheduleSource } from './schedule';

const MONTH = '2026-08';
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

function grid(patch: Partial<ScheduleSource> = {}) {
  return <CalendarGrid columns={monthColumns(source(patch), MONTH)} />;
}

describe('Сетка месяца', () => {
  it('рисует шесть недель: сетка не имеет права прыгать при листании', () => {
    render(grid());

    expect(screen.getAllByRole('link', { name: /открыть день/ })).toHaveLength(42);
  });

  it('🔴 в строке клетки есть время: капсулы без времени владелец забраковал', () => {
    render(grid({ leads: [], orders: [], blocks: [] }));

    expect(screen.getByRole('button', { name: /Звонок, 10:00–10:30/ })).toHaveAccessibleName(
      expect.stringContaining(plannedCall.clientName),
    );
  });

  it('число дня ведёт в день, а не открывает панель рядом', () => {
    render(grid());

    expect(screen.getByRole('link', { name: /23 августа.*открыть день/ })).toHaveAttribute(
      'href',
      `/admin/crm?view=day&day=${DAY}`,
    );
  });

  it('лишние записи сворачиваются в «Ещё N», а не режутся молча', () => {
    render(grid());

    const more = screen.getAllByRole('link', { name: /^Ещё / });

    expect(more.length).toBeGreaterThan(0);
    expect(more[0]).toHaveAttribute('href', expect.stringContaining('view=day'));
  });

  it('🔴 карточка записи открывается прямо из клетки месяца', async () => {
    const user = userEvent.setup();
    render(grid({ events: [], leads: [], blocks: [] }));

    await user.click(screen.getByRole('button', { name: /Наряд № 1059/ }));

    const card = screen.getByRole('dialog');

    expect(within(card).getByText(morningInstall.clientName)).toBeInTheDocument();
  });

  it('день, закрытый целиком, виден строкой, а не только краской клетки', () => {
    render(grid({ events: [], orders: [], leads: [], blocks: [wholeDayBlock] }));

    expect(
      screen.getByRole('button', { name: /Моя занятость, День закрыт, Семейные дела/ }),
    ).toBeInTheDocument();
  });

  it('🔴 занятость команды показана записями со временем, а не инициалами', () => {
    const away = { ...doctorBlock, userId: dmitry.id };
    render(grid({ events: [], orders: [], leads: [], blocks: [away], team: installers }));

    expect(
      screen.getByRole('button', { name: /Дмитрий Соколов, 14:00–16:00/ }),
    ).toBeInTheDocument();
  });

  it('сетка называется словами: у области должно быть имя', () => {
    render(grid());

    expect(screen.getByRole('region', { name: texts.gridLabel })).toBeInTheDocument();
  });
});
