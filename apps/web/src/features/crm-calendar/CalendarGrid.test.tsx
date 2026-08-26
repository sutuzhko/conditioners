import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CalendarGrid } from './CalendarGrid';
import type { DayBlockCard } from './model';
import {
  doctorBlock,
  foreignBlock,
  monthBlocks,
  monthEvents,
  monthLeads,
  viewerId,
  wholeDayBlock,
} from './fixtures';

function grid(blocks: readonly DayBlockCard[] = []) {
  return render(
    <CalendarGrid
      month="2026-08"
      selected="2026-08-23"
      today="2026-08-23"
      events={monthEvents}
      leads={monthLeads}
      blocks={blocks}
      viewerId={viewerId}
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

  it('🔴 не выделяет субботу и воскресенье: выходные отмечает человек, а не календарь', () => {
    grid();

    // 28, 29 и 30 августа 2026 — пятница, суббота и воскресенье
    const friday = screen.getByRole('link', { name: '28 августа 2026' });
    const saturday = screen.getByRole('link', { name: '29 августа 2026' });
    const sunday = screen.getByRole('link', { name: '30 августа 2026' });

    expect(saturday.className).toBe(friday.className);
    expect(sunday.className).toBe(friday.className);
  });

  it('называет закрытый день словами, а не оставляет его цветом рамки', () => {
    grid([wholeDayBlock]);

    expect(
      screen.getByRole('link', { name: /26 августа 2026, День закрыт: семейные дела/ }),
    ).toBeInTheDocument();
  });

  it('день, закрытый на два часа, называет часы — он остаётся рабочим', () => {
    grid([doctorBlock]);

    expect(
      screen.getByRole('link', { name: /24 августа 2026, Занят 14:00–16:00 — врач/ }),
    ).toBeInTheDocument();
  });

  it('повторяемая занятость закрывает каждый такой день месяца', () => {
    grid(monthBlocks);

    for (const day of ['6 августа 2026', '13 августа 2026', '27 августа 2026']) {
      expect(screen.getByRole('link', { name: new RegExp(`^${day}, День закрыт`) })).toBeTruthy();
    }
  });

  it('чужая занятость называется именем: окна разных людей не складываются', () => {
    grid([foreignBlock]);

    expect(
      screen.getByRole('link', { name: /23 августа 2026, Занят: Дмитрий/ }),
    ).toBeInTheDocument();
  });

  it('свободный день о занятости не говорит', () => {
    grid(monthBlocks);

    // 28 августа 2026 — пятница без дел, заявок и занятости
    expect(screen.getByRole('link', { name: '28 августа 2026' })).toBeInTheDocument();
  });
});
