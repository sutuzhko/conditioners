// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCityWeather } from './weather';

const TULA = { lat: 54.19, lng: 37.61 };

function respondWith(body: unknown, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, json: async () => body } as unknown as Response),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Погода в городе', () => {
  it('округляет температуру: доли градуса читателю не нужны', async () => {
    respondWith({
      daily: { temperature_2m_max: [31.2], temperature_2m_mean: [26.6] },
    });

    expect(await getCityWeather(TULA)).toEqual({ mean: 27, max: 31 });
  });

  it('🔴 берёт среднесуточную, а не текущую: чип говорит про день целиком', async () => {
    respondWith({ daily: { temperature_2m_max: [30], temperature_2m_mean: [21] } });

    await getCityWeather(TULA);

    const [url] = vi.mocked(fetch).mock.calls[0] ?? [];
    const daily = new URL(String(url)).searchParams.get('daily') ?? '';
    expect(daily).toContain('temperature_2m_mean');
    expect(daily).toContain('temperature_2m_max');
  });

  it('🔴 без координат в настройках запроса не делает вовсе (инвариант 8)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await getCityWeather({ lat: null, lng: null })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('координаты уходят в запрос те, что заданы владельцем', async () => {
    respondWith({ daily: { temperature_2m_max: [2], temperature_2m_mean: [1] } });

    await getCityWeather(TULA);

    const [url] = vi.mocked(fetch).mock.calls[0] ?? [];
    const params = new URL(String(url)).searchParams;
    expect(params.get('latitude')).toBe('54.19');
    expect(params.get('longitude')).toBe('37.61');
  });

  it('🔴 недоступный сервис не роняет страницу — просто нет чипа', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('сеть недоступна')));

    expect(await getCityWeather(TULA)).toBeNull();
  });

  it('🔴 ответ не по схеме считается отсутствующим, а не подставляется как есть', async () => {
    respondWith({ daily: { temperature_2m_max: ['жарко'] } });

    expect(await getCityWeather(TULA)).toBeNull();
  });

  it('ошибка сервиса (5xx) — тоже отсутствие данных', async () => {
    respondWith({}, false);

    expect(await getCityWeather(TULA)).toBeNull();
  });

  it('🔴 ответ кешируется на час: первый экран не ходит в чужой сервис на каждый визит', async () => {
    respondWith({ daily: { temperature_2m_max: [7], temperature_2m_mean: [5] } });

    await getCityWeather(TULA);

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect((init as { next?: { revalidate?: number } } | undefined)?.next?.revalidate).toBe(3600);
  });
});
