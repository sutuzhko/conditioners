import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewTable } from './ReviewTable';
import { reviewModerationContent as texts } from './content';
import {
  approvedReview,
  archivedReview,
  rejectedReview,
  rejectedWithoutReason,
  tableReviewsFixture,
} from './fixtures';

/* Действия строки зовут маршрутизатор, чтобы серверный список перечитался.
   В тесте его нет — подменяем. */
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

/** Заголовки колонок таблицы в том порядке, в каком они стоят. */
function headers(): string[] {
  return screen.getAllByRole('columnheader').map((cell) => cell.textContent ?? '');
}

describe('Отзывы таблицей', () => {
  /* 🔴 Инвариант 7 держится и здесь: таблица показывает текст и не даёт его
     править — ни на одной вкладке. */
  it('🔴 текст не редактируется ни в одной ячейке (инвариант 7)', () => {
    render(<ReviewTable reviews={tableReviewsFixture} tab="all" />);

    expect(screen.getByText(approvedReview.text)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  /* 🔴 Пустая колонка читается как «данных нет», хотя их и не должно быть:
     набор колонок у каждой вкладки свой (issue #613). */
  it('у опубликованных нет колонки причины отказа, у отклонённых она есть', () => {
    const { unmount } = render(<ReviewTable reviews={[approvedReview]} tab="published" />);

    expect(headers()).toEqual([
      texts.colAuthor,
      texts.colRating,
      texts.colText,
      texts.colReceived,
      texts.colActions,
    ]);
    unmount();

    render(<ReviewTable reviews={[rejectedReview]} tab="rejected" />);

    expect(headers()).toEqual([texts.colAuthor, texts.colText, texts.colReason, texts.colActions]);
  });

  it('на «Все» есть колонка статуса: список сквозной', () => {
    render(<ReviewTable reviews={tableReviewsFixture} tab="all" />);

    expect(headers()).toContain(texts.colStatus);
    expect(screen.getByText(texts.statusTitle('archived'))).toBeInTheDocument();
  });

  /* 🔴 Действия у каждой строки свои: макет их на «Все» не рисует вовсе, но
     найденный отзыв иначе пришлось бы искать второй раз на своей вкладке
     (ADR-307 §4). */
  it('на «Все» действия строки те же, что дала бы своя вкладка отзыва', () => {
    render(<ReviewTable reviews={tableReviewsFixture} tab="all" />);

    const published = screen.getByRole('group', { name: texts.rowActions(approvedReview.name) });
    expect(within(published).getByRole('button', { name: texts.archive })).toBeInTheDocument();

    const rejected = screen.getByRole('group', { name: texts.rowActions(rejectedReview.name) });
    expect(within(rejected).getByRole('button', { name: texts.restore })).toBeInTheDocument();
    expect(within(rejected).getByRole('button', { name: texts.remove })).toBeInTheDocument();
  });

  it('в архиве отзыв возвращают, а не стирают (ADR-300)', () => {
    render(<ReviewTable reviews={[archivedReview]} tab="archived" />);

    const actions = screen.getByRole('group', { name: texts.rowActions(archivedReview.name) });
    expect(within(actions).getByRole('button', { name: texts.approve })).toBeInTheDocument();
    expect(within(actions).queryByRole('button', { name: texts.remove })).toBeNull();
  });

  /* 🔴 Причина отказа видна в строке: без неё через полгода не понять, почему
     отзыв не на сайте, и решение выглядит произволом (ADR-300). */
  it('у отклонённых показывает причину, автора решения и дату', () => {
    render(<ReviewTable reviews={[rejectedReview]} tab="rejected" />);

    expect(screen.getByText(rejectedReview.reject?.reason ?? '')).toBeInTheDocument();
    expect(screen.getByText(/Богдан/)).toBeInTheDocument();
  });

  it('отклонённому без записанной причины её не выдумывает', () => {
    render(<ReviewTable reviews={[rejectedWithoutReason]} tab="rejected" />);

    expect(screen.getByText(texts.reasonMissing)).toBeInTheDocument();
  });

  /* 🔴 Три пустых состояния с разными шагами (issue #335): завести нечего,
     скрыл статус вкладки, скрыл отбор «Все». */
  it('пустой раздел, пустая вкладка и пустой поиск объясняются по-разному', () => {
    const bare = render(<ReviewTable reviews={[]} tab="all" />);
    expect(screen.getByText(texts.emptyTitle)).toBeInTheDocument();
    bare.unmount();

    const byTab = render(<ReviewTable reviews={[]} tab="published" filtered />);
    expect(screen.getByText(texts.emptyFiltered)).toBeInTheDocument();
    byTab.unmount();

    render(<ReviewTable reviews={[]} tab="all" searched />);
    expect(screen.getByText(texts.emptySearch)).toBeInTheDocument();
  });
});
