import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { crmContent as texts } from './content';
import {
  clashingRepair,
  dmitry,
  doctorBlock,
  installers,
  lateInstall,
  monthBlocks,
  monthEvents,
  monthLeads,
  monthOrders,
  morningInstall,
  viewerId,
} from './fixtures';
import {
  DEFAULT_WORK_WINDOW,
  dayColumns,
  hourRangeOf,
  marksOf,
  weekColumns,
  type ScheduleSource,
} from './schedule';
import { TimeGrid } from './TimeGrid';

const DAY = '2026-08-23';
const RANGE = hourRangeOf(DEFAULT_WORK_WINDOW);

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

function day(patch: Partial<ScheduleSource> = {}) {
  return dayColumns(source(patch), DAY);
}

describe('Сетка часов', () => {
  it('🔴 показывает сутки целиком: ночь доступна прокруткой, а не спрятана', () => {
    render(
      <TimeGrid columns={day()} view="day" range={RANGE} nowMin={14 * 60} label={texts.dayLabel} />,
    );

    const hours = screen.getByRole('group', { name: texts.hours });

    expect(within(hours).getByText('00:00')).toBeInTheDocument();
    expect(within(hours).getByText('23:00')).toBeInTheDocument();
  });

  it('🔴 называет наряд словом и номером: различие не только в цвете', () => {
    render(
      <TimeGrid columns={day()} view="day" range={RANGE} nowMin={14 * 60} label={texts.dayLabel} />,
    );

    const order = screen.getByRole('button', { name: /Наряд № 1060/ });

    expect(order).toHaveAccessibleName(expect.stringContaining('ремонт'));
    expect(order).toHaveAccessibleName(expect.stringContaining('Пётр Лапин'));
  });

  it('🔴 карточка записи открывается у самой записи, а не в колонке справа', async () => {
    const user = userEvent.setup();
    render(
      <TimeGrid columns={day()} view="day" range={RANGE} nowMin={14 * 60} label={texts.dayLabel} />,
    );

    await user.click(screen.getByRole('button', { name: /Наряд № 1059/ }));

    const card = screen.getByRole('dialog');

    expect(within(card).getByText(morningInstall.clientName)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: texts.orderOpen })).toHaveAttribute(
      'href',
      `/admin/orders/${morningInstall.id}`,
    );
  });

  it('карточка закрывается с клавиатуры и возвращает фокус на запись', async () => {
    const user = userEvent.setup();
    render(
      <TimeGrid columns={day()} view="day" range={RANGE} nowMin={14 * 60} label={texts.dayLabel} />,
    );

    const chip = screen.getByRole('button', { name: /Наряд № 1059/ });
    await user.click(chip);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(chip).toHaveFocus();
  });

  it('пересечение называется словами, а не остаётся рамкой', () => {
    render(
      <TimeGrid columns={day()} view="day" range={RANGE} nowMin={14 * 60} label={texts.dayLabel} />,
    );

    expect(screen.getByRole('button', { name: /Наряд № 1059/ })).toHaveAccessibleName(
      expect.stringContaining('Пересечение'),
    );
    expect(screen.getByRole('button', { name: /Наряд № 1060/ })).toHaveAccessibleName(
      expect.stringContaining('Пересечение'),
    );
    expect(clashingRepair.installerId).toBe(morningInstall.installerId);
  });

  it('🔴 полоса «весь день» держит заявку: её никто не назначал на час', () => {
    render(
      <TimeGrid columns={day()} view="day" range={RANGE} nowMin={14 * 60} label={texts.dayLabel} />,
    );

    const bar = screen.getByRole('list', { name: texts.allDay });

    expect(within(bar).getByRole('button', { name: /Заявка с сайта/ })).toBeInTheDocument();
  });

  it('🔴 пустой час — кнопка: запись заводится и с клавиатуры, и с тача', () => {
    render(
      <TimeGrid
        columns={day({ events: [], orders: [], leads: [] })}
        view="day"
        range={RANGE}
        nowMin={14 * 60}
        label={texts.dayLabel}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Новое дело: 23 августа, 10:00' }),
    ).toBeInTheDocument();
  });

  it('🔴 переработка помечена на самой записи, а не только в карточке', () => {
    render(
      <TimeGrid
        columns={day({ events: [lateInstall], orders: [], leads: [] })}
        view="day"
        range={RANGE}
        nowMin={14 * 60}
        label={texts.dayLabel}
      />,
    );

    expect(screen.getByRole('button', { name: /Монтаж/ })).toHaveAccessibleName(
      expect.stringContaining('Переработка: 3 ч'),
    );
  });

  it('шапка недели ведёт в день, чтобы посмотреть его крупнее', () => {
    render(
      <TimeGrid
        columns={weekColumns(source(), DAY)}
        view="week"
        range={RANGE}
        nowMin={14 * 60}
        label={texts.weekLabel}
      />,
    );

    expect(screen.getByRole('link', { name: /23 августа/ })).toHaveAttribute(
      'href',
      `/admin/crm?view=day&day=${DAY}`,
    );
  });

  it('в дне шапка никуда не ведёт: он уже открыт', () => {
    render(
      <TimeGrid columns={day()} view="day" range={RANGE} nowMin={14 * 60} label={texts.dayLabel} />,
    );

    expect(screen.queryByRole('link', { name: /23 августа/ })).not.toBeInTheDocument();
  });

  it('🔴 занятость называется словами, а не остаётся краской', () => {
    render(
      <TimeGrid
        columns={weekColumns(source({ blocks: monthBlocks }), '2026-08-26')}
        view="week"
        range={RANGE}
        nowMin={14 * 60}
        label={texts.weekLabel}
      />,
    );

    expect(screen.getAllByTitle(/День закрыт: семейные дела/).length).toBeGreaterThan(0);
  });

  it('🔴 легенда наложения называет людей: цвет не единственный признак', () => {
    render(
      <TimeGrid
        columns={day({ team: installers })}
        view="day"
        range={RANGE}
        nowMin={14 * 60}
        label={texts.dayLabel}
        team={[...marksOf(installers).values()]}
      />,
    );

    const legend = screen.getByRole('list', { name: texts.teamLegend });

    expect(within(legend).getByText(dmitry.name ?? '')).toBeInTheDocument();
    expect(within(legend).getByText('ДС')).toBeInTheDocument();
  });

  it('чужая отлучка в наложении подписана человеком и часами', () => {
    const mine = { ...doctorBlock, userId: dmitry.id, day: DAY };
    render(
      <TimeGrid
        columns={day({ team: installers, blocks: [mine] })}
        view="day"
        range={RANGE}
        nowMin={14 * 60}
        label={texts.dayLabel}
        team={[...marksOf(installers).values()]}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Дмитрий Соколов, 14:00–16:00/ }),
    ).toBeInTheDocument();
  });
});
