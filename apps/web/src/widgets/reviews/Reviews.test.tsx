import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { reviewModalContent as modalTexts } from '@/features/review-modal/content';

import { reviewsContent as t } from './content';
import { REVIEWS_VISIBLE_GRID, REVIEWS_VISIBLE_PHONE, type ReviewCardData } from './model';
import { Reviews } from './Reviews';
import {
  policyHrefFixture,
  reviewWithPhotoFixture,
  reviewWithoutPhotoFixture,
  reviewsFixture,
} from './fixtures';

/**
 * 🔴 Раскладку списка задают правила CSS, а jsdom их не применяет: смотрим в
 * источник, а поведение в браузере снято замером (issue #274). Тот же приём,
 * что у ленты фильтров каталога.
 */
const listStyles = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'ui', 'ReviewsTrack.module.css'),
  'utf8',
);

function renderSection(reviews?: readonly ReviewCardData[]) {
  return render(<Reviews policyHref={policyHrefFixture} reviews={reviews} />);
}

/** Карточка отзыва целиком — по имени автора в её подвале. */
function cardOf(name: string): HTMLElement {
  const card = screen.getByText(name).closest('li');
  if (card === null) throw new Error(`Карточка отзыва «${name}» не найдена`);
  return card;
}

/** Настоящие отзывы списка: без заготовок и без дублей ленты. */
function realCards(): readonly HTMLElement[] {
  const list = screen.getByRole('list', { name: t.listLabel });
  return [...list.children].filter(
    (item): item is HTMLElement =>
      item instanceof HTMLElement && item.getAttribute('data-role') === 'review',
  );
}

describe('Блок отзывов', () => {
  it('🔴 пустое состояние объясняет пустоту и не рисует карусель', () => {
    renderSection();

    expect(screen.getByText(t.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(t.emptyText)).toBeInTheDocument();

    /* 🔴 Ни ленты, ни заготовок под карточки (issue #274): лента без единой
       карточки читается как поломка вёрстки, а карточка-приглашение,
       повторяющая разметку отзыва, — как отзыв компании о самой себе. */
    expect(screen.queryByRole('list', { name: t.listLabel })).not.toBeInTheDocument();

    // выход из пустоты один и назван прямо
    expect(screen.getAllByRole('button', { name: t.emptyCta })).toHaveLength(1);
  });

  it('🔴 пустая секция не выдумывает ни отзывов, ни рейтинга: цифр в ней нет', () => {
    const { container } = renderSection();

    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section?.textContent ?? '').not.toMatch(/\d/);
  });

  it('🔴 форма спрятана в окно: раздел — витрина чужого опыта, а не бланк', () => {
    renderSection(reviewsFixture);

    // до нажатия ни полей, ни памятки на странице нет
    expect(screen.queryByLabelText(/Имя/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: modalTexts.open }).length).toBeGreaterThan(0);
  });

  it('рисует переданные отзывы списком: имя, дата, оценка и текст', () => {
    renderSection(reviewsFixture);

    expect(realCards()).toHaveLength(reviewsFixture.length);

    const card = cardOf('Ирина');
    expect(card.textContent).toContain('14 июня 2026');
    expect(within(card).getByRole('img')).toHaveAccessibleName('Оценка 5 из 5');
  });

  /**
   * 🔴 Заготовки нужны только ленте: с 1200px они закрывают её хвост, чтобы
   * лента не обрывалась пустотой. В колонке и сетке ниже 1200 пустая карточка
   * рядом с настоящим отзывом читается как сбой загрузки — её убирает стиль.
   */
  it('🔴 заготовки помечены и скрыты стилем ниже 1200', () => {
    renderSection(reviewsFixture);

    const list = screen.getByRole('list', { name: t.listLabel });
    const slots = [...list.children].filter((item) => item.getAttribute('data-role') === 'slot');

    expect(slots.length).toBeGreaterThan(0);
    expect(listStyles).toMatch(/@media \(width < 1200px\)[\s\S]*?data-role='slot'/);
  });

  /**
   * 🔴 Скрытые карточки остаются в разметке и гасятся стилем (ADR-195):
   * робот видит раздел целиком, человек — ровно столько, сколько прочитает.
   * Числа в `nth-child` связаны с константами руками, поэтому связь держит
   * этот тест, а не язык.
   */
  it('🔴 «Все отзывы» снимает ограничение показа, а не догружает', async () => {
    const user = userEvent.setup();
    renderSection([...reviewsFixture, reviewWithPhotoFixture]);

    const list = screen.getByRole('list', { name: t.listLabel });
    const before = realCards().length;

    const more = screen.getByRole('button', { name: t.showAll });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).toHaveAttribute('aria-controls', list.id);
    expect(list.className).toContain('clipped');

    await user.click(more);

    expect(list.className).not.toContain('clipped');
    expect(realCards()).toHaveLength(before);
    expect(screen.getByRole('button', { name: t.showLess })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('числа в стилях совпадают с пределами показа из модели', () => {
    expect(listStyles).toContain(`nth-child(n + ${REVIEWS_VISIBLE_PHONE + 1})`);
    expect(listStyles).toContain(`nth-child(n + ${REVIEWS_VISIBLE_GRID + 1})`);
  });

  it('раскрывать нечего — кнопки «Все отзывы» нет', () => {
    renderSection(reviewsFixture.slice(0, REVIEWS_VISIBLE_PHONE));

    expect(screen.queryByRole('button', { name: t.showAll })).not.toBeInTheDocument();
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

  it('🔴 в карточке снимка нет — только значок: фото вытягивало её из ряда', () => {
    renderSection([reviewWithPhotoFixture]);

    expect(screen.queryByAltText(t.photoAlt)).not.toBeInTheDocument();
    expect(screen.getByTitle(t.hasPhoto)).toBeInTheDocument();
  });

  it('окно с формой открывается по нажатию и содержит памятку', async () => {
    const user = userEvent.setup();
    renderSection(reviewsFixture);

    await user.click(screen.getAllByRole('button', { name: modalTexts.open })[0] as HTMLElement);

    expect(screen.getByRole('dialog', { name: modalTexts.title })).toBeInTheDocument();
    expect(screen.getByLabelText(/Имя/)).toBeInTheDocument();
    for (const hint of modalTexts.hints) {
      expect(screen.getByText(hint)).toBeInTheDocument();
    }
  });

  it('у секции один заголовок второго уровня — h1 принадлежит странице', () => {
    renderSection(reviewsFixture);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });
});
