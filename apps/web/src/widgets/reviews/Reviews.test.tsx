import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { Reviews } from './Reviews';
import { reviewsContent as t } from './content';
import {
  policyHrefFixture,
  reviewWithPhotoFixture,
  reviewWithoutPhotoFixture,
  reviewsFixture,
} from './fixtures';
import type { ReviewCardData } from './model';

function renderSection(reviews?: readonly ReviewCardData[]) {
  return render(<Reviews policyHref={policyHrefFixture} reviews={reviews} />);
}

/** Карточка отзыва целиком — по имени автора в её подвале. */
function cardOf(name: string): HTMLElement {
  const card = screen.getByText(name).closest('li');
  if (card === null) throw new Error(`Карточка отзыва «${name}» не найдена`);
  return card;
}

describe('Блок отзывов', () => {
  it('🔴 пустое состояние показывает приглашение, а не пустоту', () => {
    renderSection();

    expect(screen.getByRole('heading', { level: 3, name: t.emptyTitle })).toBeInTheDocument();
    expect(screen.getByText(t.emptyText)).toBeInTheDocument();
    for (const point of t.emptyPoints) {
      expect(screen.getByText(point)).toBeInTheDocument();
    }

    // приглашение ведёт к форме: на телефоне она уезжает под текст
    expect(screen.getByRole('link', { name: t.emptyCta })).toHaveAttribute('href', '#review-form');
    expect(screen.queryByRole('list', { name: t.listLabel })).not.toBeInTheDocument();
  });

  it('🔴 пустая секция не выдумывает ни отзывов, ни рейтинга: цифр в ней нет', () => {
    const { container } = renderSection();

    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    // поля формы к содержимому раздела не относятся — их подписи считаем отдельно
    section?.querySelector('form')?.remove();
    expect(section?.textContent ?? '').not.toMatch(/\d/);
  });

  it('форма отзыва стоит в секции всегда — и когда отзывов нет, и когда они есть', () => {
    const { rerender } = renderSection();
    expect(screen.getByRole('heading', { level: 3, name: 'Оставить отзыв' })).toBeInTheDocument();

    rerender(<Reviews policyHref={policyHrefFixture} reviews={reviewsFixture} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Оставить отзыв' })).toBeInTheDocument();
  });

  it('рисует переданные отзывы списком: имя, дата, оценка и текст', () => {
    renderSection(reviewsFixture);

    const list = screen.getByRole('list', { name: t.listLabel });
    expect(within(list).getAllByRole('listitem')).toHaveLength(reviewsFixture.length);

    const card = cardOf('Ирина');
    expect(card.textContent).toContain('14 июня 2026');
    expect(within(card).getByRole('img')).toHaveAccessibleName('Оценка 5 из 5');
  });

  it('🔴 текст отзыва выводится дословно: кавычки рисует CSS, а не разметка', () => {
    renderSection([reviewWithoutPhotoFixture]);

    expect(screen.getByText(reviewWithoutPhotoFixture.text)).toBeInTheDocument();
  });

  it('отзыв без района не оставляет разделителя и пустого места', () => {
    renderSection([reviewWithoutPhotoFixture]);

    const card = cardOf(reviewWithoutPhotoFixture.name);
    expect(card.textContent).not.toContain('·');
    expect(card.textContent).toContain('30 апреля 2026');
  });

  it('фотография показывается, только если её прислали', () => {
    const { rerender } = renderSection([reviewWithPhotoFixture]);

    expect(screen.getByAltText(t.photoAlt)).toBeInTheDocument();

    rerender(<Reviews policyHref={policyHrefFixture} reviews={[reviewWithoutPhotoFixture]} />);
    expect(screen.queryByAltText(t.photoAlt)).not.toBeInTheDocument();
  });

  it('у секции один заголовок второго уровня — h1 принадлежит странице', () => {
    renderSection(reviewsFixture);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });
});
