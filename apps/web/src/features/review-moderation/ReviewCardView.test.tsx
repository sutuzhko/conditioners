import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ReviewCardView } from './ReviewCardView';
import { reviewModerationContent as texts } from './content';
import {
  acceptingApi,
  approvedReview,
  failingApi,
  lowRatedReview,
  pendingReview,
  rejectedReview,
  reviewWithPhoto,
} from './fixtures';

describe('Отзыв в модерации', () => {
  it('🔴 текст не редактируется: полей ввода для него нет (инвариант 7)', () => {
    render(<ReviewCardView review={pendingReview} api={acceptingApi} tab="pending" />);

    expect(screen.getByText(pendingReview.text)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(pendingReview.text)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('🔴 оценку тоже не изменить — она часть отзыва', () => {
    render(<ReviewCardView review={lowRatedReview} api={acceptingApi} tab="pending" />);

    expect(screen.getByText(texts.rating(2))).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  /**
   * 🔴 На очереди модерации решение одно из двух, и ряд показывает ровно два
   * действия: четыре кнопки четырёх уровней заметности разом были разнобоем
   * (issue #356, BUGS).
   */
  it('на модерации предлагает опубликовать и отклонить — и ничего больше', () => {
    render(<ReviewCardView review={pendingReview} api={acceptingApi} tab="pending" />);

    expect(screen.getByRole('button', { name: texts.approve })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.reject })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.remove })).not.toBeInTheDocument();
  });

  it('на опубликованных остаётся только снятие с сайта', () => {
    render(<ReviewCardView review={approvedReview} api={acceptingApi} tab="published" />);

    expect(screen.getByRole('button', { name: texts.archive })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.approve })).not.toBeInTheDocument();
  });

  /** 🔴 Низкая оценка — не причина для отказа, и об этом сказано на месте. */
  it('о тройке напоминает там, где принимают решение', () => {
    render(<ReviewCardView review={lowRatedReview} api={acceptingApi} tab="pending" />);

    expect(screen.getByText(texts.lowRatingNote)).toBeInTheDocument();
  });

  /** 🔴 Место под причину отказа готово, а её отсутствие названо (issue #522). */
  it('на отклонённых показывает место причины и честно называет её отсутствие', () => {
    render(<ReviewCardView review={rejectedReview} api={acceptingApi} tab="rejected" />);

    expect(screen.getByText(texts.reasonTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.reasonMissing)).toBeInTheDocument();
  });

  it('публикация уходит на сервер', async () => {
    const user = userEvent.setup();
    const setStatus = vi.fn(async () => ({ ok: true }));
    render(
      <ReviewCardView review={pendingReview} api={{ ...acceptingApi, setStatus }} tab="pending" />,
    );

    await user.click(screen.getByRole('button', { name: texts.approve }));

    expect(setStatus).toHaveBeenCalledWith('r1', 'approved');
  });

  /** 🔴 Фото открывается в полный размер: по нему и решают (issue #53). */
  it('фото открывается окном в полный размер', async () => {
    const user = userEvent.setup();
    render(<ReviewCardView review={reviewWithPhoto} api={acceptingApi} tab="pending" />);

    await user.click(screen.getByRole('button', { name: texts.photoOpen }));

    expect(await screen.findByRole('dialog')).toHaveAccessibleName(
      texts.photoTitle(reviewWithPhoto.name),
    );
  });

  it('удаление спрашивает подтверждение и объясняет разницу с отклонением', async () => {
    const user = userEvent.setup();
    const confirmRemove = vi.fn(async () => false);
    const remove = vi.fn();
    render(
      <ReviewCardView
        review={rejectedReview}
        api={{ ...acceptingApi, remove }}
        tab="rejected"
        confirmRemove={confirmRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(confirmRemove).toHaveBeenCalledWith(texts.removeConfirm);
    expect(remove).not.toHaveBeenCalled();
  });

  it('🔴 подтверждение спрашивается окном панели, а не системным confirm', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }));

    render(
      <ReviewCardView review={rejectedReview} api={{ ...acceptingApi, remove }} tab="rejected" />,
    );
    await user.click(screen.getByRole('button', { name: texts.remove }));

    // окно есть в разметке — без него обещание не разрешится и удаление
    // молча не случится
    expect(await screen.findByRole('dialog')).toHaveAccessibleName(texts.removeConfirm.title);
    expect(remove).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: texts.removeConfirm.confirmLabel }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(rejectedReview.id));
  });

  it('отказ сервера объясняется и страница не перечитывается', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(
      <ReviewCardView
        review={pendingReview}
        api={failingApi}
        tab="pending"
        onChanged={onChanged}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.approve }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.serverError);
    expect(onChanged).not.toHaveBeenCalled();
  });
});
