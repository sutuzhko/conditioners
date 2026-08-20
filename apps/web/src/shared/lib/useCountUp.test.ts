import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountUp } from './useCountUp';

/** jsdom не реализует matchMedia — подменяем его в каждом тесте явно. */
function mockReducedMotion(reduce: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduce,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('первый рендер отдаёт конечное число — серверный HTML не должен содержать ноль', () => {
    const { result } = renderHook(() => useCountUp(12, { enabled: false }));

    expect(result.current).toBe(12);
  });

  it('досчитывает до цели за отведённое время', () => {
    const { result } = renderHook(() => useCountUp(100, { durationMs: 1000 }));

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(result.current).toBe(100);
  });

  it('на середине пути значение между началом и целью', () => {
    const { result } = renderHook(() => useCountUp(100, { durationMs: 1000 }));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);
  });

  it('prefers-reduced-motion: значение сразу конечное, кадры не запрашиваются', () => {
    mockReducedMotion(true);
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');

    const { result } = renderHook(() => useCountUp(2500, { durationMs: 1000 }));

    expect(result.current).toBe(2500);
    expect(raf).not.toHaveBeenCalled();
  });

  it('пока счётчик выключен, анимация не идёт', () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    renderHook(() => useCountUp(50, { enabled: false }));

    expect(raf).not.toHaveBeenCalled();
  });

  it('отсчёт можно начать не с нуля', () => {
    const { result } = renderHook(() => useCountUp(20, { durationMs: 1000, from: 10 }));

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toBeGreaterThanOrEqual(10);
  });

  it('размонтирование отменяет кадр', () => {
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const { unmount } = renderHook(() => useCountUp(100, { durationMs: 1000 }));

    unmount();

    expect(cancel).toHaveBeenCalled();
  });
});
