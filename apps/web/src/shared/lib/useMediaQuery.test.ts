import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useMediaQuery } from './useMediaQuery';

type Listener = () => void;

/**
 * Подменяет `matchMedia` управляемым списком: тест сам решает, совпадает ли
 * запрос, и сам объявляет об изменении ширины.
 */
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  let matches = initial;

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return matches;
      },
      media: query,
      addEventListener: (_: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
    })),
  );

  return {
    resize(next: boolean): void {
      matches = next;
      act(() => {
        for (const listener of listeners) listener();
      });
    },
    get subscribed(): number {
      return listeners.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useMediaQuery', () => {
  it('отвечает тем же, что и браузер', () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'));

    expect(result.current).toBe(true);
  });

  it('пересчитывается, когда окно меняет ширину', () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'));

    media.resize(true);

    expect(result.current).toBe(true);
  });

  it('отписывается при размонтировании: слушатель ширины не переживает компонент', () => {
    const media = stubMatchMedia(true);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    expect(media.subscribed).toBe(1);

    unmount();

    expect(media.subscribed).toBe(0);
  });

  it('🔴 без matchMedia отвечает «не совпало», а не падает', () => {
    vi.stubGlobal('matchMedia', undefined);

    const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'));

    expect(result.current).toBe(false);
  });
});
