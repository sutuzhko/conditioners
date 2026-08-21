import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Breadcrumbs } from './Breadcrumbs';
import { articleTrail, nestedTrail, singleTrail, siteUrlFixture } from './fixtures';

function jsonLd(container: HTMLElement): Record<string, unknown> {
  const script = container.querySelector('script[type="application/ld+json"]');
  if (script === null) throw new Error('разметки крошек нет');
  return JSON.parse(script.textContent ?? '');
}

describe('Хлебные крошки', () => {
  it('рисует след от главной и не делает ссылку на текущую страницу', () => {
    render(<Breadcrumbs items={nestedTrail} siteUrl={siteUrlFixture} />);

    expect(screen.getByRole('link', { name: 'Главная' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'База знаний' })).toHaveAttribute('href', '/knowledge');
    expect(screen.queryByRole('link', { name: 'Как выбрать кондиционер' })).toBeNull();
    expect(screen.getByText('Как выбрать кондиционер')).toHaveAttribute('aria-current', 'page');
  });

  it('🔴 подписи в разметке дословно те же, что и на экране (инвариант 9)', () => {
    const { container } = render(<Breadcrumbs items={nestedTrail} siteUrl={siteUrlFixture} />);

    const graph = jsonLd(container)['@graph'];
    if (!Array.isArray(graph)) throw new Error('в разметке нет графа');
    const list = graph[0] as { itemListElement: readonly { name: string; item?: string }[] };

    expect(list.itemListElement.map((item) => item.name)).toEqual([
      'Главная',
      'База знаний',
      'Как выбрать кондиционер',
    ]);
    for (const item of list.itemListElement) {
      expect(container.textContent).toContain(item.name);
    }
  });

  it('адреса в разметке абсолютные, у текущей страницы адреса нет', () => {
    const { container } = render(<Breadcrumbs items={nestedTrail} siteUrl={siteUrlFixture} />);

    const graph = jsonLd(container)['@graph'];
    if (!Array.isArray(graph)) throw new Error('в разметке нет графа');
    const list = graph[0] as { itemListElement: readonly { name: string; item?: string }[] };

    expect(list.itemListElement[0]?.item).toBe(`${siteUrlFixture}/`);
    expect(list.itemListElement[1]?.item).toBe(`${siteUrlFixture}/knowledge`);
    expect(list.itemListElement[2]).not.toHaveProperty('item');
  });

  it('доступен как навигация с понятной подписью', () => {
    render(<Breadcrumbs items={singleTrail} siteUrl={siteUrlFixture} />);

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
