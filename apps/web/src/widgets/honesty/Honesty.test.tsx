import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

/** Раскрывашка второй сметы. */
function rivalDetails(container: HTMLElement): HTMLDetailsElement {
  const details = container.querySelector('details');
  if (details === null) throw new Error('Раскрывашки второй сметы нет в разметке');
  return details;
}

describe('Честно о цене — вторая смета свёрнута родным details (issue #271)', () => {
  it('🔴 список второй сметы свёрнут, но лежит в HTML целиком', () => {
    const { container } = render(<HonestPricing installFrom={installFrom} />);

    const details = rivalDetails(container);
    expect(details.open).toBe(false);
    const list = within(details).getByRole('list', { name: honestyContent.rivalListLabel });
    expect(within(list).getAllByRole('listitem')).toHaveLength(rivalPoints.length);
  });

  it('заголовок и плашка второй сметы стоят вне раскрывашки — их видно на любой ширине', () => {
    const { container } = render(<HonestPricing installFrom={installFrom} />);

    const heading = screen.getByRole('heading', { level: 3, name: honestyContent.rivalTitle });
    const badge = screen.getByText(honestyContent.rivalBadge);
    const details = rivalDetails(container);
    expect(details.contains(heading)).toBe(false);
    expect(details.contains(badge)).toBe(false);
  });

  it('открывается и закрывается нажатием на подпись «На чём экономят»', async () => {
    const user = userEvent.setup();
    const { container } = render(<HonestPricing installFrom={installFrom} />);
    const details = rivalDetails(container);
    const summary = within(details).getByText(honestyContent.rivalToggle);

    expect(summary.closest('summary')).toBe(details.firstElementChild);

    await user.click(summary);
    expect(details.open).toBe(true);

    await user.click(summary);
    expect(details.open).toBe(false);
    expect(within(details).getAllByRole('listitem')).toHaveLength(rivalPoints.length);
  });

  it('первая смета раскрывашки не имеет: пять пунктов видны всегда', () => {
    const { container } = render(<HonestPricing installFrom={installFrom} />);

    const honest = screen.getByRole('list', { name: honestyContent.honestListLabel });
    expect(honest.closest('details')).toBeNull();
    expect(container.querySelectorAll('details')).toHaveLength(1);
  });
});
