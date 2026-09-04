import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { articleLabels as labels } from '@/entities/article/ui';

import { ArticleList } from './ArticleList';
import { articleContent as t } from './content';
import { ARTICLES_PAGE_SIZE } from './lib';
import {
  articleHrefFixture,
  categoryHrefFixture,
  singleCategoryFixture,
  teasersFixture,
} from './fixtures';
import type { ArticleTeaser } from './model';

function renderList(
  articles?: readonly ArticleTeaser[],
  activeCategory?: string | null,
  activePage?: number,
) {
  return render(
    <ArticleList
      articles={articles}
      activeCategory={activeCategory ?? null}
      activePage={activePage ?? 1}
      basePath="/knowledge"
      categoryHref={categoryHrefFixture}
      articleHref={articleHrefFixture}
    />,
  );
}

/** Много статей одной рубрики — чтобы разбивка на страницы вообще появилась. */
function manyArticles(count: number): readonly ArticleTeaser[] {
  const source = teasersFixture[0];
  if (source === undefined) throw new Error('фикстура пуста');

  return Array.from({ length: count }, (_, index) => ({
    ...source,
    id: `many-${index}`,
    slug: `${source.slug}-${index}`,
    title: `${source.title} — ${index + 1}`,
  }));
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
    expect(screen.getByText(labels.minutesLabel(first.minutes))).toBeInTheDocument();
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

  it('🔴 без обложки её место занимает плашка с рубрикой, а не пустота (ADR-127)', () => {
    renderList(teasersFixture);

    const list = screen.getByRole('list', { name: t.listLabel });
    const items = within(list).getAllByRole('listitem');

    for (const [index, item] of items.entries()) {
      const article = teasersFixture[index];
      if (article === undefined) throw new Error('фикстура пуста');

      if (article.cover === null) {
        expect(within(item).queryByRole('img')).toBeNull();

        // плашка на месте обложки: рубрика написана и скрыта от читалки —
        // ей ту же рубрику уже назвал бейдж над заголовком
        const plaques = within(item)
          .getAllByText(article.category)
          .filter((node) => node.getAttribute('aria-hidden') === 'true');
        expect(plaques).toHaveLength(1);
        continue;
      }

      expect(within(item).getByAltText(labels.coverAlt(article.title))).toBeInTheDocument();
    }
  });

  it('🔴 карточка — одна ссылка: вложенных в неё ссылок нет', () => {
    renderList(teasersFixture);

    const list = screen.getByRole('list', { name: t.listLabel });
    for (const item of within(list).getAllByRole('listitem')) {
      expect(within(item).getAllByRole('link')).toHaveLength(1);
    }
  });

  it('пока статьи умещаются на одну страницу, разбивки нет', () => {
    renderList(teasersFixture);

    expect(screen.queryByRole('navigation', { name: t.pagerLabel })).not.toBeInTheDocument();
  });

  it('🔴 разбивка — ссылки: страница живёт в адресе, а не в состоянии клиента', () => {
    renderList(manyArticles(ARTICLES_PAGE_SIZE + 2));

    const pager = screen.getByRole('navigation', { name: t.pagerLabel });
    expect(within(pager).getByText(t.pagerPosition(1, 2))).toBeInTheDocument();
    expect(within(pager).getByRole('link', { name: `${t.pagerNext} →` })).toHaveAttribute(
      'href',
      '/knowledge?page=2',
    );
    expect(within(list()).getAllByRole('listitem')).toHaveLength(ARTICLES_PAGE_SIZE);
  });

  it('вторая страница показывает хвост списка', () => {
    renderList(manyArticles(ARTICLES_PAGE_SIZE + 2), null, 2);

    expect(within(list()).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(t.pagerPosition(2, 2))).toBeInTheDocument();
  });

  it('🔴 номер за пределами списка прижимается к последней странице', () => {
    renderList(manyArticles(ARTICLES_PAGE_SIZE + 2), null, 99);

    expect(screen.getByText(t.pagerPosition(2, 2))).toBeInTheDocument();
  });
});

/** Сетка карточек: имя списка одно на все проверки. */
function list(): HTMLElement {
  return screen.getByRole('list', { name: t.listLabel });
}
