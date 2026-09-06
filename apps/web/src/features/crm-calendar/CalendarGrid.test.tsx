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
  vacationBlock,
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

  it('🔴 подпись дня называет число записей и требующие внимания словами', () => {
    render(grid());

    /* Ниже 600px в клетке остаются одни точки (issue #547), и смысл держится
       на подписи ссылки, а не на цвете: «23 августа, 4 записи, 2 записи
       требуют внимания, открыть день». */
    const day = screen.getByRole('link', { name: /^23 августа/ });

    expect(day).toHaveAccessibleName(expect.stringMatching(/\d+ запис/));
    expect(day).toHaveAccessibleName(expect.stringContaining('требу'));
  });

  it('пустой день так и подписан: точек в нём нет вовсе', () => {
    render(grid({ events: [], orders: [], leads: [], blocks: [] }));

    expect(screen.getByRole('link', { name: /^23 августа/ })).toHaveAccessibleName(
      expect.stringContaining(texts.columnEmpty),
    );
  });

  it('сетка называется словами: у области должно быть имя', () => {
    render(grid());

    expect(screen.getByRole('region', { name: texts.gridLabel })).toBeInTheDocument();
  });
});

/**
 * 🔴 Отпуск на две недели — одна запись, а не четырнадцать (ADR-165). В
 * месяце он читается сплошной плашкой через свои дни: четырнадцать одинаковых
 * строк «Отпуск» в четырнадцати клетках выглядят как четырнадцать отлучек.
 */
describe('Сетка месяца: многодневная отлучка', () => {
  /** Отпуск фикстуры — 19 августа по 1 сентября, три ряда августовской сетки. */
  function bands(): readonly HTMLElement[] {
    const { container } = render(
      grid({ blocks: [vacationBlock], events: [], orders: [], leads: [] }),
    );

    return [...container.querySelectorAll('[data-band]')].filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );
  }

  it('идёт плашкой через свои дни, а не строкой в каждой клетке', () => {
    const placed = bands();

    /* Три плашки: хвост недели 17–23 (ряды сетки считаются с недели 27 июля),
       вся неделя 24–30 и понедельник 31-го с первым сентября. Ряд месяца —
       своё место на экране, и одна плашка через два ряда была бы неправдой. */
    expect(placed).toHaveLength(3);
    expect(placed.map((node) => node.style.gridColumn)).toEqual([
      '3 / span 5',
      '1 / span 7',
      '1 / span 2',
    ]);
    expect(placed.map((node) => node.style.gridRow)).toEqual(['4', '5', '6']);
  });

  it('в клетке отлучка не повторяется строкой: она уже показана плашкой', () => {
    render(grid({ blocks: [vacationBlock], events: [], orders: [], leads: [] }));

    /* Слово «Отпуск» стоит в сетке трижды — по разу на плашку, — а не
       четырнадцать раз по клетке. */
    expect(screen.getAllByText(/Отпуск/)).toHaveLength(3);
  });

  it('однодневная отлучка плашкой не становится: она и так помещается в клетку', () => {
    const { container } = render(
      grid({ blocks: [wholeDayBlock], events: [], orders: [], leads: [] }),
    );

    expect(container.querySelectorAll('[data-band]')).toHaveLength(0);
  });
});
