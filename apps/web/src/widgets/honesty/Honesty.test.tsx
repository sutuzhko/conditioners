import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { HonestPricing } from './HonestPricing';
import { honestPoints, honestyContent, rivalPoints } from './content';
import { higherInstallFrom, installFrom } from './fixtures';

/** Разряды и знак рубля разделены неразрывным пробелом, а Testing Library
 *  схлопывает любые пробелы в обычный — сравниваем в том же виде. */
function spaced(text: string): string {
  return text.replace(/\s/g, ' ');
}

describe('Честно о цене — цена в заголовке', () => {
  it('подставляет цену, пришедшую из прайса', () => {
    render(<HonestPricing installFrom={installFrom} />);

    const heading = screen.getByRole('heading', { level: 2 });

    expect(heading.textContent).toMatch(/6/);
    expect(heading.textContent).toMatch(/000/);
  });

  it('другая цена в прайсе — другой заголовок: цифра не зашита в разметку', () => {
    const { unmount } = render(<HonestPricing installFrom={installFrom} />);
    const first = screen.getByRole('heading', { level: 2 }).textContent;
    unmount();

    render(<HonestPricing installFrom={higherInstallFrom} />);

    expect(screen.getByRole('heading', { level: 2 }).textContent).not.toEqual(first);
  });

  it('🔴 без переданной цены в заголовке нет ни одной цифры', () => {
    render(<HonestPricing />);

    expect(screen.getByRole('heading', { level: 2 }).textContent).not.toMatch(/\d/);
  });

  it('null от страницы читается так же, как отсутствие цены', () => {
    render(<HonestPricing installFrom={null} />);

    expect(screen.getByRole('heading', { level: 2 }).textContent).not.toMatch(/\d/);
    expect(
      screen.queryByText(spaced(honestyContent.honestPrice(installFrom))),
    ).not.toBeInTheDocument();
  });

  it('плашка с ценой появляется только вместе с ценой', () => {
    const { unmount } = render(<HonestPricing installFrom={installFrom} />);
    expect(screen.getByText(spaced(honestyContent.honestPrice(installFrom)))).toBeInTheDocument();
    unmount();

    render(<HonestPricing />);
    expect(
      screen.getByRole('heading', { level: 3, name: honestyContent.honestTitle }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(spaced(honestyContent.honestPrice(installFrom))),
    ).not.toBeInTheDocument();
  });
});

describe('Честно о цене — разбор двух смет', () => {
  it('рисует оба списка целиком и различает их голосом', () => {
    render(<HonestPricing installFrom={installFrom} />);

    const honest = screen.getByRole('list', { name: honestyContent.honestListLabel });
    const rival = screen.getByRole('list', { name: honestyContent.rivalListLabel });

    expect(within(honest).getAllByRole('listitem')).toHaveLength(honestPoints.length);
    expect(within(rival).getAllByRole('listitem')).toHaveLength(rivalPoints.length);
  });

  it('заголовок секции начинается с h2: h1 занят первым экраном', () => {
    render(<HonestPricing installFrom={installFrom} />);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });

  it('в пунктах нет ни цен, ни сроков гарантии — это данные из админки', () => {
    for (const point of [...honestPoints, ...rivalPoints]) {
      expect(point.text).not.toMatch(/₽/);
      expect(point.text).not.toMatch(/год|лет/i);
    }
  });
});
