import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import { WeatherChip } from './WeatherChip';
import { weatherChipContent as texts } from './content';
import type { ChipWeather } from './model';

const INITIAL: ChipWeather = { mean: 19, max: 22 };

/** Значения приходят в текст с типографским минусом и градусом — ищем по числу. */
const chipText = (): string => screen.getByText(/сегодня/).textContent ?? '';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  // подмена visibilityState живёт до восстановления и утекает в соседние тесты
  vi.restoreAllMocks();
});

describe('Чип погоды', () => {
  it('🔴 показывает серверные цифры сразу: они и стоят в HTML', () => {
    render(<WeatherChip city="Тула" weather={INITIAL} api={{ load: vi.fn() }} />);

    expect(chipText()).toContain('Тула сегодня');
    expect(chipText()).toContain('19');
    expect(chipText()).toContain('22');
  });

  it('называет пик месячным: иначе цифра выглядит ошибкой в прохладный день', () => {
    render(<WeatherChip city="Тула" weather={INITIAL} api={{ load: vi.fn() }} />);

    expect(chipText()).toContain(texts.peak);
  });

  it('🔴 обновляет цифры, пока вкладку держат открытой', async () => {
    const load = vi.fn(() => Promise.resolve({ mean: 24, max: 31 }));
    render(<WeatherChip city="Тула" weather={INITIAL} api={{ load }} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60_000);
    });

    expect(load).toHaveBeenCalled();
    expect(chipText()).toContain('24');
    expect(chipText()).toContain('31');
  });

  it('🔴 молчание сервиса оставляет прежние цифры, а не прочерк', async () => {
    const load = vi.fn(() => Promise.resolve(null));
    render(<WeatherChip city="Тула" weather={INITIAL} api={{ load }} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60_000);
    });

    expect(chipText()).toContain('19');
  });

  it('в скрытой вкладке в сеть не ходит: смотреть там некому', async () => {
    const load = vi.fn(() => Promise.resolve(INITIAL));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    render(<WeatherChip city="Тула" weather={INITIAL} api={{ load }} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60_000);
    });

    expect(load).not.toHaveBeenCalled();
  });

  it('возвращение к вкладке обновляет цифры, не дожидаясь таймера', async () => {
    const load = vi.fn(() => Promise.resolve({ mean: 26, max: 33 }));
    render(<WeatherChip city="Тула" weather={INITIAL} api={{ load }} />);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(chipText()).toContain('26');
  });

  it('заметка меняется вместе с пиком: жара — повод не тянуть', async () => {
    const load = vi.fn(() => Promise.resolve({ mean: 27, max: 34 }));
    render(<WeatherChip city="Тула" weather={INITIAL} api={{ load }} />);

    expect(chipText()).toContain(texts.note(22));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60_000);
    });
    expect(chipText()).toContain(texts.note(34));
  });
});
