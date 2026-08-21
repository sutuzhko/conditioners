import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { ArticleList } from './ArticleList';
import { articleContent as t } from './content';
import {
  articleHrefFixture,
  categoryHrefFixture,
  singleCategoryFixture,
  teasersFixture,
} from './fixtures';
import type { ArticleTeaser } from './model';

function renderList(articles?: readonly ArticleTeaser[], activeCategory?: string | null) {
  return render(
    <ArticleList
      articles={articles}
      activeCategory={activeCategory ?? null}
      categoryHref={categoryHrefFixture}
      articleHref={articleHrefFixture}
    />,
  );
}

describe('Листинг Базы знаний', () => {
  it('🔴 пустой список не ломает листинг: раздел объясняет пустоту', () => {
    renderList();

    expect(screen.getByRole('heading', { level: 1, name: t.title })).toBeInTheDocument();
    expect(screen.getByText(t.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: t.listLabel })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: t.filterLabel })).not.toBeInTheDocument();
  });

  it('рисует карточку статьи: рубрика, дата, время чтения, заголовок и анонс', () => {
    renderList(teasersFixture);

    const list = screen.getByRole('list', { name: t.listLabel });
    expect(within(list).getAllByRole('listitem')).toHaveLength(teasersFixture.length);

    const [first] = teasersFixture;
    if (first === undefined) throw new Error('фикстура пуста');

    expect(screen.getByText(first.excerpt)).toBeInTheDocument();
    expect(screen.getByText('14 июня 2026')).toBeInTheDocument();
    expect(screen.getByText(t.minutesLabel(first.minutes))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: first.title })).toHaveAttribute(
      'href',
      `/knowledge/${first.slug}`,
    );
  });

  it('🔴 заголовок статьи в листинге — `h2`: единственный `h1` занят разделом', () => {
    const { container } = renderList(teasersFixture);

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h2')).toHaveLength(teasersFixture.length);
  });

  it('фильтр рубрик — ссылки, а не кнопки: список приходит с сервера', () => {
    renderList(teasersFixture);

    const filter = screen.getByRole('navigation', { name: t.filterLabel });
    const links = within(filter).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual(['Все', 'Выбор', 'Монтаж', 'Уход']);
    expect(within(filter).queryByRole('button')).not.toBeInTheDocument();
  });

  it('выбранная рубрика оставляет только свои статьи и помечена текущей', () => {
    renderList(teasersFixture, 'uhod');

    const list = screen.getByRole('list', { name: t.listLabel });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Уход' })).toHaveAttribute('aria-current', 'page');
  });

  it('единственная рубрика ничего не фильтрует — фильтра нет', () => {
    renderList(singleCategoryFixture);

    expect(screen.queryByRole('navigation', { name: t.filterLabel })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: t.listLabel })).toBeInTheDocument();
  });

  it('рубрика из старой ссылки: объясняем пустоту и уводим ко всем статьям', () => {
    renderList(teasersFixture, 'takoy-rubriki-net');

    expect(screen.getByText(t.emptyFilterTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.emptyFilterLink })).toHaveAttribute(
      'href',
      '/knowledge',
    );
    expect(screen.queryByRole('list', { name: t.listLabel })).not.toBeInTheDocument();
  });

  it('статья без обложки рисуется без картинки, с обложкой — с ней', () => {
    const { container } = renderList(teasersFixture);

    expect(container.querySelectorAll('img')).toHaveLength(1);
  });
});
