import '@testing-library/jest-dom/vitest';

/**
 * jsdom не реализует `matchMedia`, а к нему обращается каждый компонент,
 * который уважает `prefers-reduced-motion`. Отвечаем «движение разрешено»:
 * это состояние по умолчанию у большинства посетителей, и тест видит
 * поведение, которое они и получат. Тесты про «просили меньше движения»
 * подменяют ответ у себя.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
