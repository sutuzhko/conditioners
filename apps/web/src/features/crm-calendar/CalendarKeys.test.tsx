import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { CalendarKeys } from './CalendarKeys';
import type { CalendarPlace } from './navigation';

const place: CalendarPlace = {
  view: 'week',
  day: '2026-08-19',
  month: '2026-08',
  today: '2026-08-29',
  team: false,
  who: null,
  kinds: null,
};

/**
 * 🔴 Нажатие задаётся **позицией** клавиши, а не символом: квадратные скобки
 * в user-event — это `code`, фигурные были бы `key`. Календарь слушает
 * позицию, и проверка обязана спрашивать его о том же.
 */
const press = async (code: string): Promise<void> => {
  await userEvent.keyboard(`[${code}]`);
};

beforeEach(() => {
  push.mockClear();
});

describe('клавиши календаря', () => {
  it('D, W и M переключают вид, дату не трогая', async () => {
    render(<CalendarKeys {...place} />);

    await press('KeyD');
    expect(push).toHaveBeenLastCalledWith('/admin/crm?view=day&day=2026-08-19');

    await press('KeyM');
    expect(push).toHaveBeenLastCalledWith('/admin/crm?view=month&month=2026-08');

    await press('KeyW');
    expect(push).toHaveBeenLastCalledWith('/admin/crm?view=week&day=2026-08-19');
  });

  it('T уводит на сегодня', async () => {
    render(<CalendarKeys {...place} />);

    await press('KeyT');

    expect(push).toHaveBeenLastCalledWith('/admin/crm?view=week&day=2026-08-29');
  });

  it('стрелки листают период', async () => {
    render(<CalendarKeys {...place} />);

    await userEvent.keyboard('{ArrowRight}');
    expect(push).toHaveBeenLastCalledWith('/admin/crm?view=week&day=2026-08-26');

    await userEvent.keyboard('{ArrowLeft}');
    expect(push).toHaveBeenLastCalledWith('/admin/crm?view=week&day=2026-08-12');
  });

  it('🔴 в поле ввода буква остаётся буквой', async () => {
    render(
      <>
        <CalendarKeys {...place} />
        <input aria-label="Поиск" />
      </>,
    );

    const field = screen.getByLabelText('Поиск');
    await userEvent.click(field);
    await userEvent.type(field, 'дом на Демонстрации');

    expect(push).not.toHaveBeenCalled();
    expect(field).toHaveValue('дом на Демонстрации');
  });

  it('🔴 сочетания с Cmd и Ctrl остаются браузеру', async () => {
    render(<CalendarKeys {...place} />);

    await userEvent.keyboard('{Meta>}d{/Meta}');
    await userEvent.keyboard('{Control>}w{/Control}');

    expect(push).not.toHaveBeenCalled();
  });

  it('пока открыто окно, клавиши принадлежат ему', async () => {
    render(
      <>
        <CalendarKeys {...place} />
        <div role="dialog" aria-label="Наряд" />
      </>,
    );

    await press('KeyT');

    expect(push).not.toHaveBeenCalled();
  });

  it('🔴 на русской раскладке та же клавиша работает так же', () => {
    render(<CalendarKeys {...place} />);

    /* Именно это набирает владелец: раскладка русская, клавиша та же, символ
       другой. Сверяйся компонент с символом — календарь молчал бы. */
    fireEvent.keyDown(document, { key: 'в', code: 'KeyD' });
    expect(push).toHaveBeenLastCalledWith('/admin/crm?view=day&day=2026-08-19');

    fireEvent.keyDown(document, { key: 'е', code: 'KeyT' });
    expect(push).toHaveBeenLastCalledWith('/admin/crm?view=week&day=2026-08-29');
  });

  it('знак вопроса открывает подсказку, а без неё ничего не делает', async () => {
    const onHelp = vi.fn();
    const { rerender } = render(<CalendarKeys {...place} onHelp={onHelp} />);

    await userEvent.keyboard('?');
    expect(onHelp).toHaveBeenCalledOnce();

    rerender(<CalendarKeys {...place} />);
    await userEvent.keyboard('?');
    expect(onHelp).toHaveBeenCalledOnce();
  });
});
