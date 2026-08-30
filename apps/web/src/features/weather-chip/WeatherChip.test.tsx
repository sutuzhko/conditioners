import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import { WeatherChip } from './WeatherChip';
import { weatherChipContent as texts } from './content';
import type { ChipWeather } from './model';

const INITIAL: ChipWeather = { mean: 19, max: 22 };

/** Значения приходят в текст с типографским минусом и градусом — ищем по числу. */
const line = (): HTMLElement => screen.getByText(/Сегодня/);

const chipText = (): string => line().textContent ?? '';

/**
 * Что от строки остаётся на телефоне.
 *
 * 🔴 Контракт разметки (issue #254): до 600 чип обязан уложиться в одну
 * строку, поэтому уточнение «ср/сут» и сезонная заметка вынесены в отдельные
 * `span` и скрыты стилем. Всё, что видно на любой ширине, — прямой текст
 * строки и сами цифры в `b`. Медиа-запрос в jsdom не работает, а структура
 * разметки проверяется здесь.
 */
const phoneText = (): string =>
  [...line().childNodes]
    .filter((node) => !(node instanceof HTMLElement) || node.tagName === 'B')
    .map((node) => node.textContent ?? '')
    .join('');

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
    render(<WeatherChip weather={INITIAL} api={{ load: vi.fn() }} />);

    expect(chipText()).toContain('19');
    expect(chipText()).toContain('22');
  });

  it('называет пик месячным: иначе цифра выглядит ошибкой в прохладный день', () => {
    render(<WeatherChip weather={INITIAL} api={{ load: vi.fn() }} />);

    expect(chipText()).toContain(texts.peak);
  });

  /**
   * 🔴 issue #253, закрывает #15. В первом экране город назван в плашке охвата
   * и в заголовке; третье повторение в погоде не несёт ничего нового.
   */
  it('🔴 города в подписи нет: в первом экране он уже назван дважды', () => {
    render(<WeatherChip weather={INITIAL} api={{ load: vi.fn() }} />);

    expect(chipText()).toMatch(/^Сегодня/);
  });

  it('🔴 на телефоне остаются только цифры и подпись пика — строка обязана быть одной', () => {
    render(<WeatherChip weather={{ mean: 15, max: 34 }} api={{ load: vi.fn() }} />);

    expect(phoneText()).toBe('Сегодня +15° · пик за месяц +34°');
  });

  it('с 600 к строке возвращаются уточнение и сезонная заметка', () => {
    render(<WeatherChip weather={{ mean: 15, max: 34 }} api={{ load: vi.fn() }} />);

    expect(chipText()).toBe(`Сегодня: ср/сут +15° · пик за месяц +34° — ${texts.note(34)}`);
  });

  it('🔴 обновляет цифры, пока вкладку держат открытой', async () => {
    const load = vi.fn(() => Promise.resolve({ mean: 24, max: 31 }));
    render(<WeatherChip weather={INITIAL} api={{ load }} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60_000);
    });

    expect(load).toHaveBeenCalled();
    expect(chipText()).toContain('24');
    expect(chipText()).toContain('31');
  });

  it('🔴 молчание сервиса оставляет прежние цифры, а не прочерк', async () => {
    const load = vi.fn(() => Promise.resolve(null));
    render(<WeatherChip weather={INITIAL} api={{ load }} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60_000);
    });

    expect(chipText()).toContain('19');
  });

  it('в скрытой вкладке в сеть не ходит: смотреть там некому', async () => {
    const load = vi.fn(() => Promise.resolve(INITIAL));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    render(<WeatherChip weather={INITIAL} api={{ load }} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60_000);
    });

    expect(load).not.toHaveBeenCalled();
  });

  it('возвращение к вкладке обновляет цифры, не дожидаясь таймера', async () => {
    const load = vi.fn(() => Promise.resolve({ mean: 26, max: 33 }));
    render(<WeatherChip weather={INITIAL} api={{ load }} />);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(chipText()).toContain('26');
  });

  it('заметка меняется вместе с пиком: жара — повод не тянуть', async () => {
    const load = vi.fn(() => Promise.resolve({ mean: 27, max: 34 }));
    render(<WeatherChip weather={INITIAL} api={{ load }} />);

    expect(chipText()).toContain(texts.note(22));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60_000);
    });
    expect(chipText()).toContain(texts.note(34));
  });
});
