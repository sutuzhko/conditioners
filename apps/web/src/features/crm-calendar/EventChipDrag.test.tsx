import { fireEvent, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AllDayBar } from './AllDayBar';
import { CalendarActionsContext, type CalendarActions } from './actions';
import { crmContent as texts } from './content';
import { EventChip } from './EventChip';
import {
  dayNote,
  doctorBlock,
  foreignVacationBlock,
  monthEvents,
  monthLeads,
  monthOrders,
  vacationBlock,
  viewerId,
  weeklyBlock,
  wholeDayBlock,
} from './fixtures';
import type { DayBlockCard } from './model';
import {
  DEFAULT_WORK_WINDOW,
  dayColumns,
  hourRangeOf,
  weekColumns,
  type ScheduleItem,
} from './schedule';
import { TimeGrid } from './TimeGrid';

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
function idleActions(): CalendarActions {
  return {
    create: vi.fn(),
    edit: vi.fn(),
    remove: vi.fn(),
    move: vi.fn(),
    moveBlock: vi.fn(),
    block: vi.fn(),
    pending: null,
  };
}

function setup(item: ScheduleItem, days: readonly string[] = WEEK) {
  const actions = idleActions();

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
  const point = (type: string, x: number, y: number): MouseEvent =>
    new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });

  /** Тащит запись на `px` пикселей вбок (и на `py` вниз) и отпускает. */
  const dragBy = (px: number, py = 0): void => {
    fireEvent(chip, point('pointerdown', 50, 300));
    fireEvent(chip, point('pointermove', 50 + px, 300 + py));
    fireEvent(chip, point('pointerup', 50 + px, 300 + py));
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

/** Неделя 24–30 августа: отпуск из фикстур накрывает её целиком. */
const BAND_DAY = '2026-08-24';

/** Неделя 17–23 августа: в её воскресенье висит заметка «не забыть». */
const NOTE_DAY = '2026-08-23';

/**
 * Отлучка в полосе «весь день» — так, как её видит человек: одной плашкой
 * через колонки (#139), а не куском в каждом дне.
 *
 * Полосу приходится мерить самим — в jsdom у элементов нулевые размеры, а
 * ширину колонки перетаскивание берёт из неё: полоса лежит поперёк всех
 * колонок сразу, и одна колонка — её ширина, делённая на их число.
 */
function band(block: DayBlockCard) {
  const actions = idleActions();
  /* Чужая отлучка приходит слоем занятости команды (ADR-123): без списка
     людей её в полосе нет вовсе. */
  const team = [{ id: block.userId, name: block.userName, login: block.userId }];
  const columns = weekColumns(
    { events: [], orders: [], leads: [], blocks: [block], viewerId, today: BAND_DAY, team },
    BAND_DAY,
  );

  const view = render(
    <CalendarActionsContext.Provider value={actions}>
      <AllDayBar columns={columns} />
    </CalendarActionsContext.Provider>,
  );

  const rail = view.container.querySelector('[data-days]');
  if (!(rail instanceof HTMLElement)) throw new Error('полоса «весь день» не нарисована');
  vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({
    ...TRACK_RECT,
    width: columns.length * COLUMN_PX,
    right: columns.length * COLUMN_PX,
  });

  const chip = view.getByRole('button', { name: new RegExp(block.reason ?? '') });
  const point = (type: string, x: number): MouseEvent =>
    new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 40 });

  const dragBy = (px: number): void => {
    fireEvent(chip, point('pointerdown', 300));
    fireEvent(chip, point('pointermove', 300 + px));
    fireEvent(chip, point('pointerup', 300 + px));
  };

  return { actions, chip, dragBy, view };
}

describe('Перенос отлучки перетаскиванием', () => {
  it('🔴 диапазон едет целиком: оба конца сдвигаются на один день', () => {
    const { actions, dragBy } = band(vacationBlock);

    dragBy(COLUMN_PX);

    expect(actions.moveBlock).toHaveBeenCalledWith(
      vacationBlock.id,
      expect.objectContaining({ day: '2026-08-20', endDay: '2026-09-02' }),
    );
  });

  it('🔴 полоса, обрезанная краем недели, едет и назад тоже', () => {
    /* Отпуск начался 19 августа, а показана неделя с 24-го: если зажимать
       сдвиг по первому видимому дню, запись не сдвинулась бы влево вовсе. */
    const { actions, dragBy } = band(vacationBlock);

    dragBy(-COLUMN_PX);

    expect(actions.moveBlock).toHaveBeenCalledWith(
      vacationBlock.id,
      expect.objectContaining({ day: '2026-08-18', endDay: '2026-08-31' }),
    );
  });

  it('однодневная отлучка едет одной датой, конец остаётся пустым', () => {
    const { actions, dragBy } = band(wholeDayBlock);

    dragBy(2 * COLUMN_PX);

    expect(actions.moveBlock).toHaveBeenCalledWith(
      wholeDayBlock.id,
      expect.objectContaining({ day: '2026-08-28', endDay: '' }),
    );
  });

  it('🔴 повторяемая занятость не переносится: у неё день недели, а не даты', () => {
    const { actions, dragBy } = band(weeklyBlock);

    dragBy(COLUMN_PX);

    expect(actions.moveBlock).not.toHaveBeenCalled();
  });

  it('🔴 чужая отлучка не переносится: подвинуть её может только хозяин', () => {
    const { actions, dragBy } = band(foreignVacationBlock);

    dragBy(COLUMN_PX);

    expect(actions.moveBlock).not.toHaveBeenCalled();
  });

  it('🔴 у чужой отлучки нет и правки в карточке — двигать её нечем вовсе', async () => {
    /* Отпуск монтажника, открытый владельцем, — чужая занятость (ADR-115):
       она приходит слоем команды и правки не имеет. Отсутствие жеста здесь —
       следствие отсутствия правки, а не поломка перетаскивания, и проверка
       называет причину: иначе «полоса не тащится» диагностируется заново. */
    const user = userEvent.setup();
    const { chip, view } = band(foreignVacationBlock);

    await user.click(chip);

    const card = view.getByRole('dialog');
    expect(within(card).queryByRole('button', { name: texts.busyEdit })).toBeNull();
    expect(within(card).queryByRole('button', { name: texts.busyDrop })).toBeNull();
  });

  it('заметка «не забыть» в той же полосе остаётся делом и едет как дело', () => {
    /* Полоса «весь день» несёт не только отлучки: заметка висит на дне, а не
       на часе, и переносится тем же жестом — но своим действием и своей
       формой (issue #143). */
    const actions = idleActions();
    const columns = weekColumns(
      { events: [dayNote], orders: [], leads: [], blocks: [], viewerId, today: NOTE_DAY },
      NOTE_DAY,
    );

    const view = render(
      <CalendarActionsContext.Provider value={actions}>
        <AllDayBar columns={columns} />
      </CalendarActionsContext.Provider>,
    );

    const rail = view.container.querySelector('[data-days]');
    if (!(rail instanceof HTMLElement)) throw new Error('полоса «весь день» не нарисована');
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({
      ...TRACK_RECT,
      width: columns.length * COLUMN_PX,
      right: columns.length * COLUMN_PX,
    });

    const chip = view.getByRole('button', { name: /Забрать трассу/ });
    const point = (type: string, x: number): MouseEvent =>
      new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 40 });

    fireEvent(chip, point('pointerdown', 300));
    fireEvent(chip, point('pointermove', 300 - COLUMN_PX));
    fireEvent(chip, point('pointerup', 300 - COLUMN_PX));

    expect(actions.moveBlock).not.toHaveBeenCalled();
    expect(actions.move).toHaveBeenCalledWith(
      dayNote.id,
      expect.objectContaining({ day: '2026-08-22' }),
    );
  });

  it('🔴 снос пальца вбок остаётся тапом: карточка открывается, правка не уходит', () => {
    const { actions, chip, dragBy, view } = band(vacationBlock);

    dragBy(5);
    fireEvent.click(chip);

    expect(actions.moveBlock).not.toHaveBeenCalled();
    expect(view.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('Перенос отлучки на часы — она стоит в сетке, а не в полосе', () => {
  /** Запись к врачу 24 августа, 14:00–16:00: день остаётся рабочим. */
  function doctorItem(): ScheduleItem {
    const day = doctorBlock.day ?? '';
    const column = dayColumns(
      { events: [], orders: [], leads: [], blocks: [doctorBlock], viewerId, today: day },
      day,
    )[0];

    const found = column?.timed[0]?.item;
    if (found === undefined) throw new Error('отлучка на часы не попала в сетку');
    return found;
  }

  /** Неделя под записью: 24 августа — вторая колонка. */
  const DOCTOR_WEEK = [DAY, '2026-08-24', '2026-08-25', '2026-08-26'];

  it('🔴 едет вбок, а окно занятости остаётся прежним', () => {
    /* Вертикаль в жесте есть — и она не должна ничего менять: «занят с 14 до
       16» задаёт форма, и одно движение мышью не имеет права переписать
       заодно и час (#144). */
    const { actions, dragBy } = setup(doctorItem(), DOCTOR_WEEK);

    dragBy(2 * COLUMN_PX, 120);

    expect(actions.moveBlock).toHaveBeenCalledWith(
      doctorBlock.id,
      expect.objectContaining({ day: '2026-08-26', from: '14:00', to: '16:00' }),
    );
    expect(actions.move).not.toHaveBeenCalled();
  });

  it('🔴 краёв для растягивания у отлучки нет: длительность задаёт форма', () => {
    const edges = (item: ScheduleItem, days: readonly string[]): number =>
      setup(item, days).view.container.querySelectorAll('[class*="edge"]').length;

    // у дела края есть — без этой половины проверка ниже ничего не доказывает
    expect(edges(pick('event'), WEEK)).toBeGreaterThan(0);
    expect(edges(doctorItem(), DOCTOR_WEEK)).toBe(0);
  });
});

describe('Полоса «весь день» в собранной сетке — жест доходит до действия', () => {
  /**
   * 🔴 Проверка на живом дереве, а не на одном компоненте.
   *
   * Тесты выше доказывают арифметику и реакцию чипа, но собирает полосу
   * `TimeGrid`: это он ставит `AllDayBar` над часами и отдаёт ей колонки. Если
   * связь порвётся там — атрибут поверхности пропадёт, полоса переедет под
   * другую разметку, обработчики отвяжутся, — все прежние проверки останутся
   * зелёными, а в браузере жеста не будет. Здесь настоящий `pointerdown` идёт
   * по кнопке в собранной сетке и обязан дойти до `moveBlock`.
   */
  it('🔴 настоящее нажатие на полосе в сетке доводит перенос до действия', () => {
    const actions = idleActions();
    const columns = weekColumns(
      { events: [], orders: [], leads: [], blocks: [vacationBlock], viewerId, today: BAND_DAY },
      BAND_DAY,
    );

    const view = render(
      <CalendarActionsContext.Provider value={actions}>
        <TimeGrid
          columns={columns}
          view="week"
          range={hourRangeOf(DEFAULT_WORK_WINDOW)}
          nowMin={12 * 60}
          label={texts.weekLabel}
        />
      </CalendarActionsContext.Provider>,
    );

    const rail = view.container.querySelector('[data-days]');
    if (!(rail instanceof HTMLElement)) throw new Error('полоса «весь день» не нарисована');
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({
      ...TRACK_RECT,
      width: columns.length * COLUMN_PX,
      right: columns.length * COLUMN_PX,
    });

    const chip = view.getByRole('button', { name: /Отпуск/ });
    const point = (type: string, x: number): MouseEvent =>
      new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 40 });

    fireEvent(chip, point('pointerdown', 300));
    fireEvent(chip, point('pointermove', 300 + COLUMN_PX));
    fireEvent(chip, point('pointerup', 300 + COLUMN_PX));

    expect(actions.moveBlock).toHaveBeenCalledWith(
      vacationBlock.id,
      expect.objectContaining({ day: '2026-08-20', endDay: '2026-09-02' }),
    );
  });

  it('🔴 полоса своей отлучки тащится, чужая — нет, и различие видно тут же', () => {
    /* Обе полосы в одной сетке: своя едет, чужая стоит. Так проверка отвечает
       на вопрос «жест сломан или запись чужая?» одним прогоном. */
    const actions = idleActions();
    const team = [
      { id: foreignVacationBlock.userId, name: foreignVacationBlock.userName, login: 'dmitry' },
    ];
    const columns = weekColumns(
      {
        events: [],
        orders: [],
        leads: [],
        blocks: [vacationBlock, foreignVacationBlock],
        viewerId,
        today: BAND_DAY,
        team,
      },
      BAND_DAY,
    );

    const view = render(
      <CalendarActionsContext.Provider value={actions}>
        <TimeGrid
          columns={columns}
          view="week"
          range={hourRangeOf(DEFAULT_WORK_WINDOW)}
          nowMin={12 * 60}
          label={texts.weekLabel}
        />
      </CalendarActionsContext.Provider>,
    );

    const rail = view.container.querySelector('[data-days]');
    if (!(rail instanceof HTMLElement)) throw new Error('полоса «весь день» не нарисована');
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({
      ...TRACK_RECT,
      width: columns.length * COLUMN_PX,
      right: columns.length * COLUMN_PX,
    });

    const point = (type: string, x: number): MouseEvent =>
      new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 40 });

    const pull = (name: RegExp): void => {
      const chip = view.getByRole('button', { name });
      fireEvent(chip, point('pointerdown', 300));
      fireEvent(chip, point('pointermove', 300 + COLUMN_PX));
      fireEvent(chip, point('pointerup', 300 + COLUMN_PX));
    };

    pull(/Больничный/);
    expect(actions.moveBlock).not.toHaveBeenCalled();

    pull(/Отпуск/);
    expect(actions.moveBlock).toHaveBeenCalledTimes(1);
  });
});
