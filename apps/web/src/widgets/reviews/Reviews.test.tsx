import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Reviews } from './Reviews';
import { reviewsContent as t } from './content';
import { reviewModalContent as modalTexts } from '@/features/review-modal/content';
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

    // 🔴 приглашение выглядит карточкой отзыва: те же подпись и подвал —
    // иначе оно выпадает из ряда и читается как поломка вёрстки
    expect(screen.getByText(t.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(t.emptyText)).toBeInTheDocument();
    expect(screen.getByText(t.emptyAuthor)).toBeInTheDocument();

    // кнопка одна — над лентой: вторая на том же экране заставляет выбирать
    // между двумя одинаковыми
    expect(screen.getAllByRole('button', { name: t.emptyCta })).toHaveLength(1);

    /* Лента на месте и без отзывов: она держит заготовки, а приглашение
       стоит в её середине — пустая полоса под заголовком выглядела бы
       поломкой вёрстки. */
    const track = screen.getByRole('list', { name: t.listLabel });
    expect(track.children.length).toBeGreaterThan(1);
  });

  it('🔴 форма спрятана в окно: раздел — витрина чужого опыта, а не бланк', () => {
    renderSection(reviewsFixture);

    // до нажатия ни полей, ни памятки на странице нет
    expect(screen.queryByLabelText(/Имя/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: modalTexts.open }).length).toBeGreaterThan(0);
  });

  it('🔴 лента держит одинаковое число мест: два отзыва в пустой строке выглядят поломкой', () => {
    const { unmount } = renderSection();
    const empty = screen.getByRole('list', { name: t.listLabel }).children.length;
    unmount();

    renderSection(reviewsFixture.slice(0, 2));
    const partial = screen.getByRole('list', { name: t.listLabel }).children.length;

    expect(partial).toBe(empty);
  });

  it('настоящие отзывы занимают места первыми, заготовки закрывают остаток', () => {
    renderSection(reviewsFixture.slice(0, 2));

    const track = screen.getByRole('list', { name: t.listLabel });
    const filled = [...track.children].filter(
      (slot) => slot.getAttribute('aria-hidden') !== 'true',
    );

    expect(filled).toHaveLength(2);
  });

  it('🔴 пустая секция не выдумывает ни отзывов, ни рейтинга: цифр в ней нет', () => {
    const { container } = renderSection();

    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    // поля формы к содержимому раздела не относятся — их подписи считаем отдельно
    section?.querySelector('form')?.remove();
    expect(section?.textContent ?? '').not.toMatch(/\d/);
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

  it('🔴 в ленте снимка нет — только значок: фото вытягивало карточку из ряда', () => {
    renderSection([reviewWithPhotoFixture]);

    expect(screen.queryByAltText(t.photoAlt)).not.toBeInTheDocument();
    expect(screen.getByTitle(t.hasPhoto)).toBeInTheDocument();
  });
  it('у секции один заголовок второго уровня — h1 принадлежит странице', () => {
    renderSection(reviewsFixture);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });
});
