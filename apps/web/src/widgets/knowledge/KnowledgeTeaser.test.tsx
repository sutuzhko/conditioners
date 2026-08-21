import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { KnowledgeTeaser } from './KnowledgeTeaser';
import { knowledgeContent as t } from './content';
import {
  allHrefFixture,
  articleHrefFixture,
  articleWithCoverFixture,
  articlesFixture,
} from './fixtures';
import type { ArticleTeaser } from './model';

function renderSection(articles?: readonly ArticleTeaser[]) {
  return render(
    <KnowledgeTeaser
      articles={articles}
      articleHref={articleHrefFixture}
      allHref={allHrefFixture}
    />,
  );
}

describe('Тизер Базы знаний', () => {
  it('🔴 пустой список не ломает вёрстку: секция объясняет пустоту', () => {
    renderSection();

    expect(screen.getByRole('heading', { level: 2, name: t.title })).toBeInTheDocument();
    expect(screen.getByText(t.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(t.emptyText)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: t.listLabel })).not.toBeInTheDocument();
  });

  it('пока статей нет, ссылки на пустой листинг тоже нет', () => {
    renderSection();

    expect(screen.queryByRole('link', { name: t.allLink })).not.toBeInTheDocument();
  });

  it('рисует переданные статьи: рубрика, заголовок, анонс, дата и время чтения', () => {
    renderSection(articlesFixture);

    const list = screen.getByRole('list', { name: t.listLabel });
    expect(within(list).getAllByRole('listitem')).toHaveLength(articlesFixture.length);

    const [first] = articlesFixture;
    expect(first).toBeDefined();
    if (first === undefined) return;

    expect(screen.getByText(first.category)).toBeInTheDocument();
    expect(screen.getByText(first.excerpt)).toBeInTheDocument();
    expect(screen.getByText('14 июня 2026')).toBeInTheDocument();
    expect(screen.getByText(t.minutesLabel(first.minutes))).toBeInTheDocument();
  });

  it('заголовок статьи — ссылка на её страницу по слагу', () => {
    renderSection(articlesFixture);

    const [first] = articlesFixture;
    if (first === undefined) throw new Error('фикстура пуста');

    expect(screen.getByRole('link', { name: first.title })).toHaveAttribute(
      'href',
      `/knowledge/${first.slug}`,
    );
    expect(screen.getByRole('link', { name: t.allLink })).toHaveAttribute('href', '/knowledge');
  });

  it('дата статьи выводится машиночитаемым `time` — её читает и разметка Article', () => {
    renderSection(articlesFixture);

    const time = screen.getByText('14 июня 2026');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', '2026-06-14');
  });

  it('обложка рисуется, только если она загружена', () => {
    const { rerender } = renderSection([articleWithCoverFixture]);
    expect(screen.getByAltText(t.coverAlt(articleWithCoverFixture.title))).toBeInTheDocument();

    rerender(
      <KnowledgeTeaser
        articles={articlesFixture}
        articleHref={articleHrefFixture}
        allHref={allHrefFixture}
      />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('у секции один заголовок второго уровня — h1 принадлежит странице', () => {
    renderSection(articlesFixture);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(articlesFixture.length);
  });
});
