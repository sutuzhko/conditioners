import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AllDayBar } from './AllDayBar';
import { CalendarStage } from './CalendarStage';
import { CalendarCreate } from './CalendarCreate';
import { EventChip } from './EventChip';
import { crmContent as texts } from './content';
import { plannedCall, vacationBlock, viewerId } from './fixtures';
import { dayColumns, weekColumns } from './schedule';

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

/** Неделя 24–30 августа: в ней показывают отпуск из фикстур. */
const BAND_DAY = '2026-08-24';

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

  it('🔴 перетаскивание отлучки и форма дают один и тот же перенос (WCAG 2.5.7)', async () => {
    const user = userEvent.setup();
    /* Отпуск с 19 августа по 1 сентября в неделе 24–30: полоса обрезана с
       обеих сторон, и тащат её целиком, а не куском в дне (#144). */
    const columns = weekColumns(
      { events: [], orders: [], leads: [], blocks: [vacationBlock], viewerId, today: BAND_DAY },
      BAND_DAY,
    );

    const view = stage(<AllDayBar columns={columns} />);

    const rail = view.container.querySelector('[data-days]');
    if (!(rail instanceof HTMLElement)) throw new Error('полоса «весь день» не нарисована');
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({
      ...TRACK_RECT,
      width: columns.length * COLUMN_PX,
      right: columns.length * COLUMN_PX,
    });

    const chip = screen.getByRole('button', { name: /Отпуск/ });
    const point = (type: string, x: number): MouseEvent =>
      new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 40 });

    fireEvent(chip, point('pointerdown', 300));
    fireEvent(chip, point('pointermove', 300 + COLUMN_PX));
    fireEvent(chip, point('pointerup', 300 + COLUMN_PX));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const dragged = lastPayload();
    // 🔴 диапазон уехал целиком: четырнадцать дней отпуска остались четырнадцатью
    expect(dragged).toMatchObject({ day: '2026-08-20', endDay: '2026-09-02' });
    /* Перенос объявляется словами и называет обе даты: сетка перерисовывается
       молча, и без объявления человек с экранным диктором о нём не узнает. */
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/перенесена/i));
    view.unmount();

    /* Путь без мыши: те же даты, но выбранные полями формы. Замена считается
       равной, только если приводит к тому же запросу — иначе одно-указательная
       альтернатива обещана, а не дана. */
    fetchMock.mockClear();
    stage(<AllDayBar columns={columns} />);

    await user.click(screen.getByRole('button', { name: /Отпуск/ }));
    await user.click(screen.getByRole('button', { name: texts.busyEdit }));

    const day = screen.getByLabelText(new RegExp(texts.fieldDay));
    const endDay = screen.getByLabelText(new RegExp(texts.fieldEndDay));
    expect(day).toHaveValue(vacationBlock.day);
    expect(endDay).toHaveValue(vacationBlock.endDay);

    fireEvent.change(day, { target: { value: '2026-08-20' } });
    fireEvent.change(endDay, { target: { value: '2026-09-02' } });
    await user.click(screen.getByRole('button', { name: texts.save }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(lastPayload()).toEqual(dragged);
  });

  it('🔴 второй жест по той же отлучке не уходит, пока не пришла новая сетка', async () => {
    /* Между ответом сервера и новой сеткой на экране стоит прежний черновик.
       Жест по нему посчитал бы перенос от старых дат: сервер получил бы те же
       числа второй раз, а объявление отчиталось бы о новых — человеку сказали
       бы «перенесено на два дня», а запись уехала бы на один (#144). */
    const columns = weekColumns(
      { events: [], orders: [], leads: [], blocks: [vacationBlock], viewerId, today: BAND_DAY },
      BAND_DAY,
    );

    /* Ответ не приходит, пока его не отпустят: это и есть то самое окно. */
    let release: (() => void) | null = null;
    fetchMock.mockImplementation(
      async () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: true, status: 200, json: async () => ({}) });
        }),
    );

    const view = stage(<AllDayBar columns={columns} />);

    const rail = view.container.querySelector('[data-days]');
    if (!(rail instanceof HTMLElement)) throw new Error('полоса «весь день» не нарисована');
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({
      ...TRACK_RECT,
      width: columns.length * COLUMN_PX,
      right: columns.length * COLUMN_PX,
    });

    const point = (type: string, x: number): MouseEvent =>
      new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 40 });

    const pull = (): void => {
      const chip = screen.getByRole('button', { name: /Отпуск/ });
      fireEvent(chip, point('pointerdown', 300));
      fireEvent(chip, point('pointermove', 300 + COLUMN_PX));
      fireEvent(chip, point('pointerup', 300 + COLUMN_PX));
    };

    pull();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    pull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // отпускаем ответ здесь же: незавершённый запрос утёк бы в соседний тест
    await act(async () => {
      release?.();
    });
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
