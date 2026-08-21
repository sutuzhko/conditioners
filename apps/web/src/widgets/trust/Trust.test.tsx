import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { formatNumber } from '@/shared/lib/format';

import { achievements, warranty, warrantyEmpty, warrantyPartial } from './fixtures';
import { Services } from './Services';
import { TrustStrip } from './TrustStrip';
import { WhyUs } from './WhyUs';

/**
 * jsdom не реализует matchMedia. По умолчанию отвечаем «пользователь просил
 * меньше движения»: счётчики сразу показывают конечное число — ровно то
 * состояние, которое обязано быть в HTML без JS.
 */
function stubMotion(reduced: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  stubMotion(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Testing Library схлопывает пробелы, включая неразрывный из `formatNumber`. */
const visible = (text: string): string => text.replace(/\u00A0/g, ' ');

describe('Полоса доверия', () => {
  it('перечисляет утверждения об услуге', () => {
    render(<TrustStrip />);

    const list = screen.getByRole('list', { name: 'Как мы работаем' });
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(list).toHaveTextContent('Официальный договор и чек');
    expect(list).toHaveTextContent('Вакуумация на каждом монтаже');
  });

  it('не содержит ни одной цифры: сроки и достижения — не текст вёрстки', () => {
    render(<TrustStrip />);

    expect(screen.getByRole('list', { name: 'Как мы работаем' }).textContent).not.toMatch(/\d/);
  });
});

describe('Услуги', () => {
  it('рисует три карточки заголовками третьего уровня', () => {
    render(<Services />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Полный цикл: от подбора до сервиса',
    );
    expect(screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)).toEqual([
      'Продажа',
      'Монтаж',
      'Обслуживание',
    ]);
  });

  it('по умолчанию ведёт на якоря главной', () => {
    render(<Services />);

    expect(screen.getByRole('link', { name: /В каталог/ })).toHaveAttribute('href', '#catalog');
    expect(screen.getByRole('link', { name: /Сервис и ремонт/ })).toHaveAttribute(
      'href',
      '#service',
    );
  });

  it('адрес ссылки задаёт страница: карта URL блоку не принадлежит', () => {
    render(<Services hrefs={{ sale: '#modeli' }} />);

    expect(screen.getByRole('link', { name: /В каталог/ })).toHaveAttribute('href', '#modeli');
    expect(screen.getByRole('link', { name: /Как это проходит/ })).toHaveAttribute(
      'href',
      '#installation',
    );
  });
});

describe('Почему нас выбирают', () => {
  it('без переданных цифр полосы достижений нет вовсе', () => {
    render(<WhyUs />);

    expect(screen.queryByLabelText('Наши цифры')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Почему в Туле выбирают нас',
    );
    expect(document.body.textContent).not.toMatch(/\d/);
  });

  it('пустой список достижений не подставляет значений по умолчанию', () => {
    render(<WhyUs achievements={[]} />);

    expect(screen.queryByLabelText('Наши цифры')).not.toBeInTheDocument();
  });

  it('показывает переданные цифры: значение и подпись', () => {
    render(<WhyUs achievements={achievements} />);

    const list = screen.getByLabelText('Наши цифры');
    expect(visible(list.textContent ?? '')).toContain(`${visible(formatNumber(1200))}+`);
    expect(list).toHaveTextContent('установок в Туле');
    expect(list).toHaveTextContent('8 лет');
  });

  it('счётчик доходит до переданного значения, когда движение разрешено', async () => {
    stubMotion(false);
    render(<WhyUs achievements={[{ value: 1200, suffix: '+', label: 'установок в Туле' }]} />);

    await waitFor(
      () => {
        expect(visible(screen.getByLabelText('Наши цифры').textContent ?? '')).toContain(
          `${visible(formatNumber(1200))}+`,
        );
      },
      { timeout: 5000 },
    );
  });

  it('гарантия берётся из пропса, а не из вёрстки', () => {
    render(<WhyUs warranty={warranty} />);

    const card = screen
      .getByRole('heading', { level: 3, name: 'Гарантия по договору' })
      .closest('li');
    expect(card).not.toBeNull();
    expect(card).toHaveTextContent('На монтаж');
    expect(card).toHaveTextContent('3 года');
    expect(card).toHaveTextContent('На оборудование');
    expect(card).toHaveTextContent('1 год');
  });

  it('незаполненный срок выпадает из карточки, пустая гарантия убирает её целиком', () => {
    const { rerender } = render(<WhyUs warranty={warrantyPartial} />);

    expect(screen.getByText('3 года')).toBeInTheDocument();
    expect(screen.queryByText('На оборудование')).not.toBeInTheDocument();

    rerender(<WhyUs warranty={warrantyEmpty} />);
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Гарантия по договору' }),
    ).not.toBeInTheDocument();
  });
});
