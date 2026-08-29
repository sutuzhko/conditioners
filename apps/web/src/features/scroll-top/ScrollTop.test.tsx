import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ScrollTop } from './ScrollTop';
import { scrollTopContent as texts } from './content';

const scrollTo = vi.fn();

function scrollBy(pixels: number): void {
  Object.defineProperty(window, 'scrollY', { value: pixels, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

beforeEach(() => {
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  vi.stubGlobal('scrollTo', scrollTo);
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const button = () => screen.queryByRole('button', { name: texts.label });

describe('Кнопка «Наверх»', () => {
  it('🔴 наверху страницы её нет: возвращаться некуда', () => {
    render(<ScrollTop />);

    expect(button()).not.toBeInTheDocument();
  });

  it('появляется после двух экранов прокрутки', () => {
    render(<ScrollTop />);

    scrollBy(900);
    expect(button()).not.toBeInTheDocument();

    scrollBy(2000);
    expect(button()).toBeInTheDocument();
  });

  it('возвращает к началу страницы', async () => {
    const user = userEvent.setup();
    render(<ScrollTop />);
    scrollBy(2000);

    await user.click(screen.getByRole('button', { name: texts.label }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  /**
   * 🔴 Проверка родилась из дефекта, который эти тесты пропустили целиком
   * (#180). Фокус в шапку без `preventScroll` заставляет браузер подтянуть
   * элемент в видимую область — и этим отменяет только что запущенную плавную
   * прокрутку. На стенде страница уезжала с 11682 до 11309 и вставала.
   *
   * jsdom прокрутку не считает, поэтому здесь проверяется ровно та строка,
   * которая ломалась; настоящую координату меряет сквозной сценарий.
   */
  it('🔴 фокус в шапку не отменяет прокрутку: preventScroll обязателен', async () => {
    const user = userEvent.setup();
    const link = document.createElement('a');
    link.href = '#';
    const header = document.createElement('header');
    header.append(link);
    document.body.append(header);
    const focus = vi.spyOn(link, 'focus');

    render(<ScrollTop />);
    scrollBy(2000);

    await user.click(screen.getByRole('button', { name: texts.label }));

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    header.remove();
  });

  it('🔴 просили меньше движения — прокрутка мгновенная', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    render(<ScrollTop />);
    scrollBy(2000);

    await user.click(screen.getByRole('button', { name: texts.label }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('🔴 фокус уезжает в шапку: кнопка исчезает, и ему негде остаться', async () => {
    const user = userEvent.setup();
    render(
      <>
        <header>
          {/* кнопка, а не ссылка: правило Next запрещает голый <a> на маршрут,
              а для проверки фокуса важен любой интерактивный элемент шапки */}
          <button type="button">Тулаклимат</button>
        </header>
        <ScrollTop />
      </>,
    );
    scrollBy(2000);

    await user.click(screen.getByRole('button', { name: texts.label }));

    expect(screen.getByRole('button', { name: 'Тулаклимат' })).toHaveFocus();
  });

  it('🔴 уходит с экрана, пока видна форма заявки: там под ней поля', () => {
    render(
      <>
        {/* прямоугольник секции задаётся вручную: в jsdom раскладки нет */}
        <section id="lead" />
        <ScrollTop />
      </>,
    );
    const lead = document.getElementById('lead');
    if (lead === null) throw new Error('секция заявки не отрисовалась');

    // DOMRect(x, y, ширина, высота): секция начинается в середине окна
    lead.getBoundingClientRect = () => new DOMRect(0, 400, 320, 800);
    scrollBy(2000);
    expect(button()).not.toBeInTheDocument();

    // форма ушла выше окна — кнопке снова есть что делать
    lead.getBoundingClientRect = () => new DOMRect(0, -900, 320, 800);
    scrollBy(2100);
    expect(button()).toBeInTheDocument();
  });

  it('снова прячется, когда человек вернулся наверх', () => {
    render(<ScrollTop />);

    scrollBy(2000);
    expect(button()).toBeInTheDocument();

    scrollBy(0);
    expect(button()).not.toBeInTheDocument();
  });
});
