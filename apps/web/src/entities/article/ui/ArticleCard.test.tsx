import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { ArticleCard } from './ArticleCard';
import { articleLabels as t } from './content';
import {
  articleBareFixture,
  articleFixture,
  articleHrefFixture,
  articleWithCoverFixture,
} from './fixtures';
import type { ArticleTeaser } from '../model';

function renderCard(article: ArticleTeaser, headingLevel?: 2 | 3) {
  return render(
    <ul>
      <ArticleCard article={article} href={articleHrefFixture} headingLevel={headingLevel} />
    </ul>,
  );
}

describe('Карточка статьи', () => {
  it('рисует рубрику, заголовок, анонс, дату и время чтения', () => {
    renderCard(articleFixture);

    expect(
      screen.getByText(articleFixture.category, { ignore: '[aria-hidden="true"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(articleFixture.excerpt)).toBeInTheDocument();
    expect(screen.getByText(t.minutesLabel(articleFixture.minutes))).toBeInTheDocument();

    const time = screen.getByText('14 июня 2026');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', '2026-06-14');
  });

  it('🔴 вся карточка — одна ссылка, и её имя — заголовок статьи', () => {
    renderCard(articleFixture);

    const item = screen.getByRole('listitem');
    const links = within(item).getAllByRole('link');

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName(articleFixture.title);
    expect(links[0]).toHaveAttribute('href', '/knowledge/kak-vybrat');
  });

  it('уровень заголовка задаёт страница: h3 в тизере, h2 в листинге', () => {
    const { unmount } = renderCard(articleFixture);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    unmount();

    renderCard(articleFixture, 2);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('обложка приходит `next/image` с осмысленным alt', () => {
    renderCard(articleWithCoverFixture);

    expect(screen.getByAltText(t.coverAlt(articleWithCoverFixture.title))).toBeInTheDocument();
  });

  it('🔴 без обложки её место занимает плашка, скрытая от читалки (ADR-127)', () => {
    renderCard(articleFixture);

    expect(screen.queryByRole('img')).toBeNull();
    const plaque = screen
      .getAllByText(articleFixture.category)
      .find((node) => node.getAttribute('aria-hidden') === 'true');
    expect(plaque).toBeDefined();
  });

  it('незаполненные рубрика и анонс просто не рисуются', () => {
    renderCard(articleBareFixture);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(articleBareFixture.title);
    expect(screen.queryByText(t.categoryLabel)).toBeNull();
    // плашка без рубрики подписывается разделом, а не пустотой
    expect(screen.getByText(t.coverFallbackLabel)).toHaveAttribute('aria-hidden', 'true');
  });
});
