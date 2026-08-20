import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HonestPricing } from './HonestPricing';
import { ScamAccordion } from './ScamAccordion';
import { honestPoints, honestyContent, rivalPoints, scamContent, scamSchemes } from './content';
import { higherInstallFrom, installFrom, scamArticleHref } from './fixtures';
import type { ScamScheme } from './model';

/** Схема по порядковому номеру: индексация массива под strict даёт `undefined`. */
function schemeAt(index: number): ScamScheme {
  const scheme = scamSchemes[index];
  if (scheme === undefined) throw new Error(`В разборе нет схемы №${index + 1}`);
  return scheme;
}

/** Разряды и знак рубля разделены неразрывным пробелом, а Testing Library
 *  схлопывает любые пробелы в обычный — сравниваем в том же виде. */
function spaced(text: string): string {
  return text.replace(/\s/g, ' ');
}

/** Кнопка схемы — по её названию: порядок в DOM повторяет порядок контента. */
function triggerOf(scheme: ScamScheme): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(scheme.title) });
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

describe('Как обманывают — содержимое аккордеона', () => {
  it('🔴 разбор каждой схемы есть в DOM, когда все схемы свёрнуты', () => {
    render(<ScamAccordion defaultOpen={[]} />);

    for (const scheme of scamSchemes) {
      expect(screen.getByText(scheme.truth)).toBeInTheDocument();
      expect(screen.getByText(`«${scheme.quote}»`)).toBeInTheDocument();
      expect(triggerOf(scheme)).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('раскрытие меняет состояние, а не состав DOM: текст был на месте и до клика', async () => {
    const user = userEvent.setup();
    render(<ScamAccordion defaultOpen={[]} />);

    const scheme = schemeAt(1);
    const trigger = triggerOf(scheme);

    expect(screen.getByText(scheme.truth)).toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(scheme.truth)).toBeInTheDocument();
  });

  it('по умолчанию раскрыта первая схема — как в макете', () => {
    render(<ScamAccordion />);

    expect(triggerOf(schemeAt(0))).toHaveAttribute('aria-expanded', 'true');
  });

  it('показывает все пять схем с их номерами', () => {
    render(<ScamAccordion />);

    expect(screen.getAllByRole('button')).toHaveLength(scamSchemes.length);
    for (const scheme of scamSchemes) {
      expect(screen.getByText(scamContent.schemeLabel(scheme.num))).toBeInTheDocument();
    }
  });

  it('заголовок секции — h2, схемы под ним — h3', () => {
    render(<ScamAccordion />);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(scamSchemes.length);
  });
});

describe('Как обманывают — клавиатура', () => {
  it('до схемы можно дойти табом и раскрыть её и Enter, и пробелом', async () => {
    const user = userEvent.setup();
    render(<ScamAccordion defaultOpen={[]} />);

    const first = triggerOf(schemeAt(0));
    const second = triggerOf(schemeAt(1));

    await user.tab();
    expect(first).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(first).toHaveAttribute('aria-expanded', 'true');

    await user.tab();
    expect(second).toHaveFocus();

    await user.keyboard(' ');
    expect(second).toHaveAttribute('aria-expanded', 'true');
    // режим single: раскрытие соседней схемы сворачивает предыдущую
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('порядок табов идёт по схемам и заканчивается ссылкой на разбор', async () => {
    const user = userEvent.setup();
    render(<ScamAccordion defaultOpen={[]} articleHref={scamArticleHref} />);

    for (const scheme of scamSchemes) {
      await user.tab();
      expect(triggerOf(scheme)).toHaveFocus();
    }

    await user.tab();
    expect(screen.getByRole('link', { name: new RegExp(scamContent.articleLink) })).toHaveFocus();
  });
});

describe('Как обманывают — ссылка на разбор', () => {
  it('ведёт туда, куда указала страница', () => {
    render(<ScamAccordion articleHref={scamArticleHref} />);

    expect(screen.getByRole('link', { name: new RegExp(scamContent.articleLink) })).toHaveAttribute(
      'href',
      scamArticleHref,
    );
  });

  it('без адреса статьи ссылки нет вовсе — мёртвая ссылка хуже её отсутствия', () => {
    render(<ScamAccordion />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
