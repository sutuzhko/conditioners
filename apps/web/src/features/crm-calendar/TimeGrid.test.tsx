import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { crmContent as texts } from './content';
import {
  clashingRepair,
  dmitry,
  doctorBlock,
  installers,
  monthBlocks,
  monthEvents,
  monthLeads,
  monthOrders,
  morningInstall,
  plannedCall,
  viewerId,
} from './fixtures';
import { dayColumns, marksOf, weekColumns, type ScheduleSource } from './schedule';
import { TimeGrid } from './TimeGrid';

const DAY = '2026-08-23';

function source(patch: Partial<ScheduleSource> = {}): ScheduleSource {
  return {
    events: monthEvents,
    orders: monthOrders,
    leads: monthLeads,
    blocks: [],
    viewerId,
    today: DAY,
    selected: DAY,
    ...patch,
  };
}

describe('Сетка часов', () => {
  it('🔴 наряд ведёт в свою карточку, дело открывается в панели дня', () => {
    render(
      <TimeGrid
        columns={dayColumns(source(), DAY)}
        view="day"
        nowMin={14 * 60}
        label={texts.dayLabel}
      />,
    );

    expect(screen.getByRole('link', { name: /Наряд № 1059/ })).toHaveAttribute(
      'href',
      `/admin/orders/${morningInstall.id}`,
    );
    expect(screen.getByRole('link', { name: /^Звонок/ }).getAttribute('href')).toContain(
      `/admin/crm?view=day&day=${DAY}#event-${plannedCall.id}`,
    );
  });

  it('🔴 называет наряд словом и номером: различие не только в цвете', () => {
    render(
      <TimeGrid
        columns={dayColumns(source(), DAY)}
        view="day"
        nowMin={14 * 60}
        label={texts.dayLabel}
      />,
    );

    const order = screen.getByRole('link', { name: /Наряд № 1060/ });

    expect(order).toHaveAccessibleName(expect.stringContaining('ремонт'));
    expect(order).toHaveAccessibleName(expect.stringContaining('Пётр Лапин'));
  });

  it('пересечение называется словами, а не остаётся рамкой', () => {
    render(
      <TimeGrid
        columns={dayColumns(source(), DAY)}
        view="day"
        nowMin={14 * 60}
        label={texts.dayLabel}
      />,
    );

    expect(
      screen.getAllByRole('link', { name: new RegExp(`Наряд № ${clashingRepair.number}`) })[0],
    ).toHaveAccessibleName(expect.stringContaining('Пересечение'));
  });

  it('сетка называется словами — у области есть подпись', () => {
    render(
      <TimeGrid
        columns={weekColumns(source(), DAY)}
        view="week"
        nowMin={14 * 60}
        label={texts.weekLabel}
      />,
    );

    expect(screen.getByRole('region', { name: texts.weekLabel })).toBeInTheDocument();
  });

  it('шапка дня недели ведёт в вид «день» этого числа', () => {
    render(
      <TimeGrid
        columns={weekColumns(source(), DAY)}
        view="week"
        nowMin={14 * 60}
        label={texts.weekLabel}
      />,
    );

    // 17 августа 2026 — понедельник этой недели
    expect(screen.getAllByRole('link', { name: 'Пн 17' })[0]).toHaveAttribute(
      'href',
      '/admin/crm?view=day&day=2026-08-17',
    );
  });

  it('заявка попадает в группу без времени, а не растягивает сетку', () => {
    render(
      <TimeGrid
        columns={dayColumns(source(), DAY)}
        view="day"
        nowMin={14 * 60}
        label={texts.dayLabel}
      />,
    );

    const spare = screen.getByLabelText(texts.untimed);

    expect(within(spare).getByRole('link', { name: /Сергей/ })).toBeInTheDocument();
  });

  it('загрузка дня подписана часами, а не одной полоской', () => {
    render(
      <TimeGrid
        columns={dayColumns(source(), DAY)}
        view="day"
        nowMin={14 * 60}
        label={texts.dayLabel}
      />,
    );

    // 10:00–13:00, 12:00–14:00 и 11:00–12:30 — пять с половиной часов работы
    expect(screen.getAllByText(/занято/)[0]).toBeInTheDocument();
  });

  it('🔴 в наложении у каждого своя краска и свои инициалы рядом с ней', () => {
    const marks = [...marksOf(installers).values()];

    render(
      <TimeGrid
        columns={dayColumns(source({ team: installers }), DAY)}
        view="day"
        nowMin={14 * 60}
        label={texts.dayLabel}
        team={marks}
      />,
    );

    const legend = screen.getByRole('list', { name: texts.teamLegend });

    expect(within(legend).getByText(dmitry.name ?? '')).toBeInTheDocument();
    expect(within(legend).getAllByText('ДС')[0]).toBeInTheDocument();
  });

  it('чужая отлучка в наложении не ссылка: открывать в ней нечего', () => {
    const mine = { ...doctorBlock, userId: dmitry.id, day: DAY };

    render(
      <TimeGrid
        columns={dayColumns(source({ team: installers, blocks: [mine] }), DAY)}
        view="day"
        nowMin={14 * 60}
        label={texts.dayLabel}
        team={[...marksOf(installers).values()]}
      />,
    );

    const away = screen.getByRole('img', { name: /Дмитрий Соколов, 14:00–16:00/ });

    expect(away).toBeInTheDocument();
    expect(away.tagName).toBe('SPAN');
  });

  it('без наложения легенды нет вовсе', () => {
    render(
      <TimeGrid
        columns={dayColumns(source(), DAY)}
        view="day"
        nowMin={14 * 60}
        label={texts.dayLabel}
      />,
    );

    expect(screen.queryByRole('list', { name: texts.teamLegend })).toBeNull();
  });

  it('занятость колонки называется словом: цвет рамки скринридеру не читается', () => {
    render(
      <TimeGrid
        columns={weekColumns(source({ blocks: monthBlocks }), '2026-08-26')}
        view="week"
        nowMin={14 * 60}
        label={texts.weekLabel}
      />,
    );

    expect(screen.getAllByTitle(/День закрыт/)[0]).toBeInTheDocument();
  });

  it('линии «сейчас» нет там, где сегодняшнего дня в сетке нет', () => {
    render(
      <TimeGrid
        columns={dayColumns(source({ today: '2026-09-01' }), DAY)}
        view="day"
        nowMin={14 * 60 + 20}
        label={texts.dayLabel}
      />,
    );

    // 14:20 — не подпись часа: такой текст даёт только линия «сейчас»
    expect(screen.queryByText('14:20')).toBeNull();
  });

  it('линия «сейчас» стоит на текущем часе своей колонки', () => {
    render(
      <TimeGrid
        columns={dayColumns(source(), DAY)}
        view="day"
        nowMin={14 * 60 + 20}
        label={texts.dayLabel}
      />,
    );

    expect(screen.getByText('14:20')).toBeInTheDocument();
  });

  it('пустой день не притворяется занятым', () => {
    render(
      <TimeGrid
        columns={weekColumns(source({ events: [], orders: [], leads: [] }), DAY)}
        view="week"
        nowMin={14 * 60}
        label={texts.weekLabel}
      />,
    );

    expect(screen.queryByText(/занято/)).toBeNull();
  });
});
