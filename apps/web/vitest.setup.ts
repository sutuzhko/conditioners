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

/**
 * jsdom не реализует `ResizeObserver`. Наблюдение за размером нужно всему,
 * что встаёт рядом со своим элементом — выпадающему меню строки, подсказке,
 * автодополнению, — и без заглушки такой компонент падает в тесте на
 * конструкторе, ничего не сказав о своём поведении. Заглушка ничего не
 * наблюдает: тест, которому нужен вызов, подменяет её у себя и зовёт
 * обработчик сам.
 */
if (typeof globalThis.ResizeObserver !== 'function') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

/**
 * jsdom не реализует и `document.fonts`. Обещание уже выполнено: шрифты в
 * тестовой среде не подгружаются, и «раскладка доехала» наступает сразу.
 */
if (typeof document !== 'undefined' && !('fonts' in document)) {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
}
