import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CalendarStage } from './CalendarStage';
import { CalendarCreate } from './CalendarCreate';
import { EventChip } from './EventChip';
import { crmContent as texts } from './content';
import { plannedCall, viewerId } from './fixtures';
import { dayColumns } from './schedule';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const fetchMock = vi.fn();
const DAY = '2026-08-23';

/** Дело из фикстур в том виде, в каком его отдаёт раскладка. */
function eventItem() {
  const column = dayColumns(
    { events: [plannedCall], orders: [], leads: [], blocks: [], viewerId, today: DAY },
    DAY,
  )[0];

  const item = column?.timed[0]?.item;
  if (item === undefined || item.edit === null) throw new Error('дело не попало в сетку');
  return item;
}

function stage(children: React.ReactNode, confirmRemove?: () => Promise<boolean>) {
  return render(
    <CalendarStage day={DAY} viewerId={viewerId} confirmRemove={confirmRemove}>
      {children}
    </CalendarStage>,
  );
}

beforeEach(() => {
  refresh.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Неделя под записью: по её колонкам считается перенос вбок. */
const WEEK = [DAY, '2026-08-24', '2026-08-25'];
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

/** Тело последнего запроса правки: по нему сверяются два пути переноса. */
function lastPayload(): unknown {
  const call = fetchMock.mock.calls.at(-1);
  const init = call?.[1];
  if (typeof init?.body !== 'string') throw new Error('запрос правки не ушёл');
  return JSON.parse(init.body);
}

describe('Управляющий слой календаря', () => {
  it('🔴 сетка приходит разметкой и остаётся на месте: слой её не собирает', () => {
    stage(<p>сетка часов</p>);

    expect(screen.getByText('сетка часов')).toBeInTheDocument();
  });

  it('«Новое дело» открывает форму на выбранный день', async () => {
    const user = userEvent.setup();
    stage(<CalendarCreate day={DAY} />);

    await user.click(screen.getByRole('button', { name: texts.add }));

    expect(screen.getByRole('dialog', { name: texts.addTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(texts.fieldDay))).toHaveValue(DAY);
  });

  it('🔴 длительность есть в форме: растягивание края — ускоритель, а не путь', async () => {
    const user = userEvent.setup();
    stage(<CalendarCreate day={DAY} />);

    await user.click(screen.getByRole('button', { name: texts.add }));

    expect(screen.getByLabelText(new RegExp(texts.fieldDuration))).toHaveValue('60');
  });

  it('«Отметить занятость» открывает свою форму, а не форму дела (ADR-115)', async () => {
    const user = userEvent.setup();
    stage(<CalendarCreate day={DAY} canBlock />);

    await user.click(screen.getByRole('button', { name: texts.busyAdd }));

    expect(screen.getByRole('dialog', { name: texts.busyAddTitle })).toBeInTheDocument();
  });

  it('🔴 удаление подтверждается диалогом, а не окном браузера (ADR-113)', async () => {
    const user = userEvent.setup();
    const item = eventItem();
    const ask = vi.fn().mockResolvedValue(true);

    stage(<EventChip item={item} />, ask);

    await user.click(screen.getByRole('button', { name: item.label }));
    await user.click(screen.getByRole('button', { name: texts.remove }));

    await waitFor(() => expect(ask).toHaveBeenCalledWith(texts.removeConfirm));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/admin/crm/${plannedCall.id}`,
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('отказ от подтверждения ничего не удаляет', async () => {
    const user = userEvent.setup();
    const item = eventItem();
    const ask = vi.fn().mockResolvedValue(false);

    stage(<EventChip item={item} />, ask);

    await user.click(screen.getByRole('button', { name: item.label }));
    await user.click(screen.getByRole('button', { name: texts.remove }));

    await waitFor(() => expect(ask).toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('🔴 перетаскивание вбок и форма дают один и тот же перенос (WCAG 2.5.7)', async () => {
    const user = userEvent.setup();
    const item = eventItem();

    /* Путь мышью: запись уезжает на две колонки вправо. Полосу приходится
       мерить самим — в jsdom у элементов нулевые размеры; событие собирается
       из `MouseEvent`, потому что `PointerEvent` в jsdom нет вовсе. */
    const view = stage(
      <div data-track="">
        <EventChip
          item={item}
          draggable
          days={WEEK}
          place={{
            topPercent: 0,
            heightPercent: 10,
            leftPercent: 0,
            widthPercent: 100,
            depth: 0,
          }}
        />
      </div>,
    );

    const track = view.container.querySelector('[data-track]');
    if (!(track instanceof HTMLElement)) throw new Error('полоса колонки не нарисована');
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(TRACK_RECT);

    const chip = screen.getByRole('button', { name: item.label });
    const point = (type: string, x: number): MouseEvent =>
      new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 300 });

    fireEvent(chip, point('pointerdown', 50));
    fireEvent(chip, point('pointermove', 50 + 2 * COLUMN_PX));
    fireEvent(chip, point('pointerup', 50 + 2 * COLUMN_PX));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const dragged = lastPayload();
    view.unmount();

    /* Путь без мыши: та же запись, та же дата — но выбранная полем формы.
       Перетаскивание обязано иметь одно-указательную замену (WCAG 2.5.7), и
       замена считается равной только если приводит к тому же запросу. */
    fetchMock.mockClear();
    stage(<EventChip item={item} />);

    await user.click(screen.getByRole('button', { name: item.label }));
    await user.click(screen.getByRole('button', { name: texts.edit }));

    const day = screen.getByLabelText(new RegExp(texts.fieldDay));
    expect(day).toHaveValue(DAY);
    fireEvent.change(day, { target: { value: '2026-08-25' } });
    await user.click(screen.getByRole('button', { name: texts.save }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(lastPayload()).toEqual(dragged);
  });

  it('🔴 изменение объявляется словами: сетка перерисовывается молча', async () => {
    const user = userEvent.setup();
    const item = eventItem();
    const ask = vi.fn().mockResolvedValue(true);

    stage(<EventChip item={item} />, ask);

    await user.click(screen.getByRole('button', { name: item.label }));
    await user.click(screen.getByRole('button', { name: texts.remove }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(texts.removedNote));
  });
});
