import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import { ActionBar } from './ActionBar';
import { CompareOfferSource } from './compare';
import { actionBarContent as t } from './content';
import { contactsFixture } from './fixtures';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

/**
 * jsdom не реализует `IntersectionObserver` и не считает раскладку. Подмена
 * даёт тесту руль: он сам объявляет, что метка первого экрана ушла из кадра,
 * а форма заявки — вошла.
 */
type Watcher = { readonly targets: Set<Element>; report(target: Element, on: boolean): void };

function stubObserver(): Watcher {
  const targets = new Set<Element>();
  let notify: ((entries: readonly IntersectionObserverEntry[]) => void) | null = null;

  class Stub {
    constructor(callback: (entries: readonly IntersectionObserverEntry[]) => void) {
      notify = callback;
    }

    observe(target: Element): void {
      targets.add(target);
    }

    disconnect(): void {
      targets.clear();
    }
  }

  vi.stubGlobal('IntersectionObserver', Stub);

  return {
    targets,
    report(target, on) {
      act(() => {
        notify?.([{ target, isIntersecting: on } as IntersectionObserverEntry]);
      });
    },
  };
}

/** Ширина окна: панель живёт ниже 600, кнопка «наверх» — с 600. */
function stubWidth(wide: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width') ? wide : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Метка первого экрана — единственный узел панели, который есть всегда. */
function sentinelOf(container: HTMLElement): Element {
  const node = container.querySelector('[aria-hidden="true"]');
  if (node === null) throw new Error('метка первого экрана не отрисовалась');
  return node;
}

const panel = () => screen.queryByRole('navigation', { name: t.label });

beforeEach(() => {
  stubWidth(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('Панель действий', () => {
  it('🔴 в первом экране её нет: там свой призыв', () => {
    stubObserver();

    render(<ActionBar contacts={contactsFixture} />);

    expect(panel()).not.toBeInTheDocument();
  });

  it('появляется, когда первый экран уехал вверх', () => {
    const watcher = stubObserver();
    const { container } = render(<ActionBar contacts={contactsFixture} />);

    watcher.report(sentinelOf(container), false);

    expect(panel()).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Оставить заявку/ })).toBeInTheDocument();
  });

  it('прячется снова, когда человек вернулся в первый экран', () => {
    const watcher = stubObserver();
    const { container } = render(<ActionBar contacts={contactsFixture} />);
    const sentinel = sentinelOf(container);

    watcher.report(sentinel, false);
    expect(panel()).toBeInTheDocument();

    watcher.report(sentinel, true);
    expect(panel()).not.toBeInTheDocument();
  });

  it('🔴 уходит, когда в кадре форма заявки: она под панелью', () => {
    const watcher = stubObserver();
    const { container } = render(
      <>
        <section id="lead" />
        <ActionBar contacts={contactsFixture} />
      </>,
    );
    const lead = document.getElementById('lead');
    if (lead === null) throw new Error('секция заявки не отрисовалась');

    watcher.report(sentinelOf(container), false);
    expect(panel()).toBeInTheDocument();

    watcher.report(lead, true);
    expect(panel()).not.toBeInTheDocument();

    watcher.report(lead, false);
    expect(panel()).toBeInTheDocument();
  });

  it('🔴 с 600 панели нет вовсе: телефон и заявка видны в шапке', () => {
    stubWidth(true);
    const watcher = stubObserver();

    const { container } = render(<ActionBar contacts={contactsFixture} />);

    expect(panel()).not.toBeInTheDocument();
    // и метки первого экрана тоже нет: наблюдать нечего и незачем
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(watcher.targets.size).toBe(0);
  });

  it('телефон берётся из настроек и звонит по tel:', () => {
    const watcher = stubObserver();
    const { container } = render(<ActionBar contacts={contactsFixture} />);
    watcher.report(sentinelOf(container), false);

    const call = screen.getByRole('link', { name: /Позвонить/ });

    expect(call).toHaveAttribute('href', 'tel:+74872900000');
  });
});

describe('Счётчик сравнения в панели', () => {
  const renderWithCatalog = (count: number) => {
    const watcher = stubObserver();
    const view = render(
      <>
        <CompareOfferSource count={count} href="/compare" />
        <ActionBar contacts={contactsFixture} />
      </>,
    );
    watcher.report(sentinelOf(view.container), false);
    return view;
  };

  it('🔴 отмечены модели — вторая кнопка ведёт в сравнение', () => {
    renderWithCatalog(2);

    const compare = screen.getByRole('link', { name: t.compareAria(2) });

    expect(compare).toHaveAttribute('href', '/compare');
    expect(compare).toHaveTextContent('2');
    expect(screen.queryByRole('link', { name: t.lead })).not.toBeInTheDocument();
  });

  it('отметок нет — на месте остаётся заявка', () => {
    renderWithCatalog(0);

    expect(screen.getByRole('link', { name: t.lead })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Сравнить/ })).not.toBeInTheDocument();
  });

  it('🔴 каталог ушёл — предложение снимается вместе с ним', () => {
    /* Каркас на месте, уходит только страница каталога: панель живёт в
       layout и переход между страницами её не размонтирует. */
    const Tree = ({ inCatalog }: { inCatalog: boolean }) => (
      <>
        {inCatalog ? <CompareOfferSource count={3} href="/compare" /> : null}
        <ActionBar contacts={contactsFixture} />
      </>
    );
    const watcher = stubObserver();
    const { container, rerender } = render(<Tree inCatalog />);
    watcher.report(sentinelOf(container), false);
    expect(screen.getByRole('link', { name: t.compareAria(3) })).toBeInTheDocument();

    rerender(<Tree inCatalog={false} />);

    expect(screen.getByRole('link', { name: t.lead })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Сравнить/ })).not.toBeInTheDocument();
  });
});
