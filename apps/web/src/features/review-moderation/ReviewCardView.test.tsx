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
} from './fixtures';

describe('Отзыв в модерации', () => {
  it('🔴 текст не редактируется: полей ввода для него нет (инвариант 7)', () => {
    render(<ReviewCardView review={pendingReview} api={acceptingApi} />);

    expect(screen.getByText(pendingReview.text)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(pendingReview.text)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('🔴 оценку тоже не изменить — она часть отзыва', () => {
    render(<ReviewCardView review={lowRatedReview} api={acceptingApi} />);

    expect(screen.getByText(texts.rating(2))).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('публикация уходит на сервер', async () => {
    const user = userEvent.setup();
    const setStatus = vi.fn(async () => ({ ok: true }));
    render(<ReviewCardView review={pendingReview} api={{ ...acceptingApi, setStatus }} />);

    await user.click(screen.getByRole('button', { name: texts.approve }));

    expect(setStatus).toHaveBeenCalledWith('r1', 'approved');
  });

  it('действие, которое уже применено, не предлагается', () => {
    render(<ReviewCardView review={approvedReview} api={acceptingApi} />);

    expect(screen.queryByRole('button', { name: texts.approve })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.restore })).toBeInTheDocument();
  });

  it('удаление спрашивает подтверждение и объясняет разницу с отклонением', async () => {
    const user = userEvent.setup();
    const confirmRemove = vi.fn(async () => false);
    const remove = vi.fn();
    render(
      <ReviewCardView
        review={pendingReview}
        api={{ ...acceptingApi, remove }}
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

    render(<ReviewCardView review={pendingReview} api={{ ...acceptingApi, remove }} />);
    await user.click(screen.getByRole('button', { name: texts.remove }));

    // окно есть в разметке — без него обещание не разрешится и удаление
    // молча не случится
    expect(await screen.findByRole('dialog')).toHaveAccessibleName(texts.removeConfirm.title);
    expect(remove).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: texts.removeConfirm.confirmLabel }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(pendingReview.id));
  });

  it('отказ сервера объясняется и страница не перечитывается', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<ReviewCardView review={pendingReview} api={failingApi} onChanged={onChanged} />);

    await user.click(screen.getByRole('button', { name: texts.approve }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.serverError);
    expect(onChanged).not.toHaveBeenCalled();
  });
});
