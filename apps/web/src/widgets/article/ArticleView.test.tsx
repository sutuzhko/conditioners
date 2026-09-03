import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { articleLabels as labels } from '@/entities/article/ui';

import { ArticleView } from './ArticleView';
import { articleContent as t } from './content';
import {
  articleFixture,
  articleWithCoverFixture,
  ctaLinksFixture,
  leadHrefFixture,
  listHrefFixture,
  shortArticleFixture,
} from './fixtures';
import type { ArticleFull } from './model';

function renderArticle(article: ArticleFull = articleFixture, breadcrumbs?: React.ReactNode) {
  return render(
    <ArticleView
      article={article}
      listHref={listHrefFixture}
      leadHref={leadHrefFixture}
      links={ctaLinksFixture}
      {...(breadcrumbs === undefined ? {} : { breadcrumbs })}
    />,
  );
}

describe('Страница статьи', () => {
  it('🔴 единственный `h1` — заголовок статьи, разметка идёт с `h2`', () => {
    const { container } = renderArticle();

    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toBe(articleFixture.title);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
  });

  it('рисует рубрику, дату и время чтения', () => {
    renderArticle();

    expect(screen.getByText(articleFixture.category)).toBeInTheDocument();
    expect(screen.getByText('14 июня 2026')).toBeInTheDocument();
    expect(screen.getByText(labels.minutesLabel(articleFixture.minutes))).toBeInTheDocument();
  });

  it('оглавление ведёт на якоря заголовков самого текста', () => {
    const { container } = renderArticle();

    const toc = screen.getByRole('navigation', { name: t.tocLabel });
    const links = [...toc.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(links).toEqual([
      '#shag-1-moschnost-po-ploschadi',
      '#shag-2-invertor-ili-on-off',
      '#shag-3-uroven-shuma',
    ]);
    for (const href of links) {
      expect(container.querySelector(`h2${href ?? ''}`)).not.toBeNull();
    }
  });

  it('у короткой заметки оглавления нет — оно там ничего не даёт', () => {
    renderArticle(shortArticleFixture);

    expect(screen.queryByRole('navigation', { name: t.tocLabel })).not.toBeInTheDocument();
  });

  it('обложки может не быть — это рабочее состояние', () => {
    const { container } = renderArticle();

    expect(container.querySelector('img')).toBeNull();
  });

  it('обложка выводится с осмысленным `alt`', () => {
    renderArticle(articleWithCoverFixture);

    expect(screen.getByAltText(labels.coverAlt(articleWithCoverFixture.title))).toBeInTheDocument();
  });

  it('под текстом — переход к заявке и к коммерческим страницам', () => {
    renderArticle();

    expect(screen.getByRole('link', { name: t.ctaLead })).toHaveAttribute('href', '/#lead');
    for (const link of ctaLinksFixture) {
      expect(screen.getByRole('link', { name: link.label })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: t.backToList })).toHaveAttribute('href', '/knowledge');
  });

  it('хлебные крошки приходят слотом, без слота их просто нет', () => {
    renderArticle(articleFixture, <nav aria-label="Хлебные крошки" />);

    expect(screen.getByRole('navigation', { name: 'Хлебные крошки' })).toBeInTheDocument();
  });
});
