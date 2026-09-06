import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CalendarActionsContext, type CalendarActions } from './actions';
import { EventChip } from './EventChip';
import { dayNote, monthEvents, monthLeads, monthOrders, viewerId } from './fixtures';
import { dayColumns, type ScheduleItem } from './schedule';

const DAY = '2026-08-23';

/** Неделя, показанная в сетке: запись стоит в её первой колонке. */
const WEEK = [
  DAY,
  '2026-08-24',
  '2026-08-25',
  '2026-08-26',
  '2026-08-27',
  '2026-08-28',
  '2026-08-29',
];

/** Колонка в тесте: сто пикселей ширины и минута в пикселе по высоте. */
const COLUMN_PX = 100;
const TRACK_RECT: DOMRect = {
  x: 0,
  y: 0,
  width: COLUMN_PX,
  height: 24 * 60,
  top: 0,
  left: 0,
  right: COLUMN_PX,
  bottom: 24 * 60,
  toJSON: () => ({}),
};

function itemsOf(): readonly ScheduleItem[] {
  const column = dayColumns(
    {
      events: [...monthEvents, dayNote],
      orders: monthOrders,
      leads: monthLeads,
      blocks: [],
      viewerId,
      today: DAY,
    },
    DAY,
  )[0];

  return [...(column?.allDay ?? []), ...(column?.timed ?? []).map((placed) => placed.item)];
}

function pick(entity: ScheduleItem['entity']): ScheduleItem {
  const found = itemsOf().find((item) => item.entity === entity);
  if (found === undefined) throw new Error(`нет записи «${entity}» в фикстурах`);
  return found;
}

/**
 * Ставит запись в полосу колонки и даёт средства ею подвигать.
 *
 * Полосу приходится мерить самим: в jsdom у элементов нулевые размеры, и без
 * этого перетаскивание не началось бы ни у кого — тест доказывал бы работу
 * jsdom, а не запрет для наряда. Событие собирается из `MouseEvent`, потому
 * что `PointerEvent` в jsdom нет вовсе, а помощник `fireEvent.pointerDown`
 * молча отдаёт голый `Event` — без `button` и координат.
 */
function setup(item: ScheduleItem, days: readonly string[] = WEEK) {
  const actions: CalendarActions = {
    create: vi.fn(),
    edit: vi.fn(),
    remove: vi.fn(),
    move: vi.fn(),
    block: vi.fn(),
    pending: null,
  };

  const view = render(
    <CalendarActionsContext.Provider value={actions}>
      <div data-track="">
        <EventChip
          item={item}
          draggable
          days={days}
          place={{
            topPercent: 0,
            heightPercent: 10,
            leftPercent: 0,
            widthPercent: 100,
            depth: 0,
          }}
        />
      </div>
    </CalendarActionsContext.Provider>,
  );

  const track = view.container.querySelector('[data-track]');
  if (!(track instanceof HTMLElement)) throw new Error('полоса колонки не нарисована');
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(TRACK_RECT);

  const chip = view.getByRole('button', { name: item.label });
  const point = (type: string, x: number): MouseEvent =>
    new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 300 });

  /** Тащит запись на `px` пикселей вбок и отпускает. */
  const dragBy = (px: number): void => {
    fireEvent(chip, point('pointerdown', 50));
    fireEvent(chip, point('pointermove', 50 + px));
    fireEvent(chip, point('pointerup', 50 + px));
  };

  return { actions, chip, dragBy, view };
}

/** Тащит запись на `columns` колонок вбок. */
function drag(item: ScheduleItem, columns: number): CalendarActions {
  const { actions, dragBy } = setup(item);
  dragBy(columns * COLUMN_PX);

  return actions;
}

describe('Перенос записи перетаскиванием', () => {
  it('🔴 дело едет вбок: день меняется, время остаётся прежним', () => {
    const event = pick('event');
    const actions = drag(event, 2);

    expect(actions.move).toHaveBeenCalledWith(
      event.edit?.id,
      expect.objectContaining({ day: '2026-08-25', time: event.time }),
    );
  });

  it('за краем недели дня нет — запись остаётся в последней колонке', () => {
    const event = pick('event');
    const actions = drag(event, 9);

    expect(actions.move).toHaveBeenCalledWith(
      event.edit?.id,
      expect.objectContaining({ day: '2026-08-29' }),
    );
  });

  it('🔴 наряд не переносится: его место определяет свой раздел (ADR-093)', () => {
    const actions = drag(pick('order'), 2);

    expect(actions.move).not.toHaveBeenCalled();
  });

  it('🔴 заявка не переносится: календарь показывает её, но не управляет ею', () => {
    const actions = drag(pick('lead'), 2);

    expect(actions.move).not.toHaveBeenCalled();
  });

  it('движение короче порога остаётся кликом, а не переносом', () => {
    const actions = drag(pick('event'), 0);

    expect(actions.move).not.toHaveBeenCalled();
  });

  it('🔴 снос пальца вбок остаётся тапом: карточка открывается, правка не уходит', () => {
    /* На тач-экране палец уезжает на несколько пикселей у каждого тапа — это
       норма, а не перенос. Ни дня, ни часа такой снос не меняет, и жест,
       ничего не изменивший, обязан остаться нажатием (issue #143). */
    const { actions, chip, dragBy, view } = setup(pick('event'));

    dragBy(5);
    fireEvent.click(chip);

    expect(actions.move).not.toHaveBeenCalled();
    expect(view.getByRole('dialog')).toBeInTheDocument();
  });

  it('🔴 в виде дня колонка одна — запись вбок не едет', () => {
    const { actions, dragBy } = setup(pick('event'), [DAY]);

    dragBy(3 * COLUMN_PX);

    expect(actions.move).not.toHaveBeenCalled();
  });
});
