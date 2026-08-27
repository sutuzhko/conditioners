import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CalendarActionsContext, type CalendarActions } from './actions';
import { ColumnCanvas } from './ColumnCanvas';
import { DEFAULT_WORK_WINDOW, hourRangeOf, isOffHour } from './schedule';

const DAY = '2026-08-23';

function canvas(reachable = true) {
  const actions: CalendarActions = {
    create: vi.fn(),
    edit: vi.fn(),
    remove: vi.fn(),
    move: vi.fn(),
    block: vi.fn(),
    pending: null,
  };

  const range = hourRangeOf(DEFAULT_WORK_WINDOW);
  const offHours = range.hours.filter((hour) => isOffHour(range, hour));

  render(
    <CalendarActionsContext.Provider value={actions}>
      <ColumnCanvas day={DAY} offHours={offHours} reachable={reachable} />
    </CalendarActionsContext.Provider>,
  );

  return actions;
}

describe('Пустое место колонки', () => {
  it('🔴 каждый час — кнопка: запись заводится и с клавиатуры, и с тача', () => {
    canvas();

    expect(screen.getAllByRole('button')).toHaveLength(24);
    expect(
      screen.getByRole('button', { name: 'Новое дело: 23 августа, 00:00' }),
    ).toBeInTheDocument();
  });

  it('клик по часу заводит запись именно на этот час', async () => {
    const user = userEvent.setup();
    const actions = canvas();

    await user.click(screen.getByRole('button', { name: 'Новое дело: 23 августа, 14:00' }));

    expect(actions.create).toHaveBeenCalledWith(DAY, 14 * 60);
  });

  it('ночной час доступен так же, как дневной: сетка показывает сутки целиком', async () => {
    const user = userEvent.setup();
    const actions = canvas();

    await user.click(screen.getByRole('button', { name: 'Новое дело: 23 августа, 03:00' }));

    expect(actions.create).toHaveBeenCalledWith(DAY, 3 * 60);
  });

  it('🔴 в неделе часы не забирают клавиатуру: путь с клавиатуры — кнопка в шапке', () => {
    canvas(false);

    expect(screen.getByRole('button', { name: 'Новое дело: 23 августа, 10:00' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });
});
