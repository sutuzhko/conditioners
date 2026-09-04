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
  rejectedWithoutReason,
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
  it('на отклонённых показывает причину, автора решения и дату', () => {
    render(<ReviewCardView review={rejectedReview} api={acceptingApi} tab="rejected" />);

    expect(screen.getByText(texts.reasonTitle)).toBeInTheDocument();
    expect(screen.getByText(rejectedReview.reject?.reason ?? '')).toBeInTheDocument();
    expect(screen.getByText(/Богдан/)).toBeInTheDocument();
  });

  /* 🔴 Отклонённые до появления поля: выдумывать им причину нельзя, а пустое
     место под подписью читается как «причины не было». */
  it('у отказа без записанной причины отсутствие названо словами', () => {
    render(<ReviewCardView review={rejectedWithoutReason} api={acceptingApi} tab="rejected" />);

    expect(screen.getByText(texts.reasonMissing)).toBeInTheDocument();
  });

  it('публикация не спрашивает причину: объясняют отказ, а не согласие', async () => {
    const user = userEvent.setup();
    const setStatus = vi.fn(async () => ({ ok: true }));
    render(
      <ReviewCardView review={pendingReview} api={{ ...acceptingApi, setStatus }} tab="pending" />,
    );

    await user.click(screen.getByRole('button', { name: texts.approve }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(setStatus).toHaveBeenCalledWith('r1', { status: 'approved' });
  });

  /** 🔴 ADR-300: отказ без причины не уходит на сервер вовсе. */
  describe('отказ спрашивает причину', () => {
    it('нажатие «Отклонить» открывает окно, а не отправляет запрос', async () => {
      const user = userEvent.setup();
      const setStatus = vi.fn(async () => ({ ok: true }));
      render(
        <ReviewCardView
          review={pendingReview}
          api={{ ...acceptingApi, setStatus }}
          tab="pending"
        />,
      );

      await user.click(screen.getByRole('button', { name: texts.reject }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(setStatus).not.toHaveBeenCalled();
    });

    it('короткая отговорка не проходит и объясняет, чего не хватает', async () => {
      const user = userEvent.setup();
      const setStatus = vi.fn(async () => ({ ok: true }));
      render(
        <ReviewCardView
          review={pendingReview}
          api={{ ...acceptingApi, setStatus }}
          tab="pending"
        />,
      );

      await user.click(screen.getByRole('button', { name: texts.reject }));
      await user.click(screen.getByRole('button', { name: texts.rejectConfirm }));

      expect(screen.getByText(texts.reasonTooShort)).toBeInTheDocument();
      expect(setStatus).not.toHaveBeenCalled();
    });

    it('причина уходит на сервер вместе со статусом', async () => {
      const user = userEvent.setup();
      const setStatus = vi.fn(async () => ({ ok: true }));
      render(
        <ReviewCardView
          review={pendingReview}
          api={{ ...acceptingApi, setStatus }}
          tab="pending"
        />,
      );

      await user.click(screen.getByRole('button', { name: texts.reject }));
      await user.type(
        screen.getByLabelText(texts.reasonTitle),
        'Реклама стороннего магазина со ссылкой',
      );
      await user.click(screen.getByRole('button', { name: texts.rejectConfirm }));

      expect(setStatus).toHaveBeenCalledWith('r1', {
        status: 'rejected',
        reason: 'Реклама стороннего магазина со ссылкой',
      });
    });

    it('отмена закрывает окно и ничего не меняет', async () => {
      const user = userEvent.setup();
      const setStatus = vi.fn(async () => ({ ok: true }));
      render(
        <ReviewCardView
          review={pendingReview}
          api={{ ...acceptingApi, setStatus }}
          tab="pending"
        />,
      );

      await user.click(screen.getByRole('button', { name: texts.reject }));
      await user.click(screen.getByRole('button', { name: texts.rejectCancel }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(setStatus).not.toHaveBeenCalled();
    });
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
