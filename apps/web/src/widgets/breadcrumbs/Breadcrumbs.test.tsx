import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Breadcrumbs } from './Breadcrumbs';
import { articleTrail, productTrail, serviceTrail, siteUrlFixture } from './fixtures';

function jsonLd(container: HTMLElement): Record<string, unknown> {
  const script = container.querySelector('script[type="application/ld+json"]');
  if (script === null) throw new Error('разметки крошек нет');
  return JSON.parse(script.textContent ?? '');
}

describe('Хлебные крошки', () => {
  it('рисует след от главной и не делает ссылку на текущую страницу', () => {
    render(<Breadcrumbs items={productTrail} siteUrl={siteUrlFixture} />);

    expect(screen.getByRole('link', { name: 'Главная' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Каталог' })).toHaveAttribute('href', '/catalog');
    expect(screen.queryByRole('link', { name: 'Сплит-система 09' })).toBeNull();
    expect(screen.getByText('Сплит-система 09')).toHaveAttribute('aria-current', 'page');
  });

  it('🔴 подписи в разметке дословно те же, что и на экране (инвариант 9)', () => {
    const { container } = render(<Breadcrumbs items={productTrail} siteUrl={siteUrlFixture} />);

    const graph = jsonLd(container)['@graph'];
    if (!Array.isArray(graph)) throw new Error('в разметке нет графа');
    const list = graph[0] as { itemListElement: readonly { name: string; item?: string }[] };

    expect(list.itemListElement.map((item) => item.name)).toEqual([
      'Главная',
      'Каталог',
      'Сплит-система 09',
    ]);
    for (const item of list.itemListElement) {
      expect(container.textContent).toContain(item.name);
    }
  });

  it('адреса в разметке абсолютные, у текущей страницы адреса нет', () => {
    const { container } = render(<Breadcrumbs items={productTrail} siteUrl={siteUrlFixture} />);

    const graph = jsonLd(container)['@graph'];
    if (!Array.isArray(graph)) throw new Error('в разметке нет графа');
    const list = graph[0] as { itemListElement: readonly { name: string; item?: string }[] };

    expect(list.itemListElement[0]?.item).toBe(`${siteUrlFixture}/`);
    expect(list.itemListElement[1]?.item).toBe(`${siteUrlFixture}/catalog`);
    expect(list.itemListElement[2]).not.toHaveProperty('item');
  });

  it('доступен как навигация с понятной подписью', () => {
    render(<Breadcrumbs items={serviceTrail} siteUrl={siteUrlFixture} />);

    expect(screen.getByRole('navigation', { name: 'Хлебные крошки' })).toBeInTheDocument();
  });

  it('на главной след из одного звена не рисуется вовсе', () => {
    const { container } = render(<Breadcrumbs items={[]} siteUrl={siteUrlFixture} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('длинный заголовок статьи остаётся звеном следа', () => {
    render(<Breadcrumbs items={articleTrail} siteUrl={siteUrlFixture} />);

    expect(screen.getByRole('link', { name: 'База знаний' })).toHaveAttribute('href', '/knowledge');
  });
});
