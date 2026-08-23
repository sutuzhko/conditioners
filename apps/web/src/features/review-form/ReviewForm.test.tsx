import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReviewForm } from './ReviewForm';
import { reviewFormContent as texts } from './content';
import { policyHrefFixture } from './fixtures';
import type { ReviewSubmit } from './model';

const REVIEW_TEXT = 'Поставили сплит в спальню, трассу спрятали в короб. Смета совпала.';

function setup(props: Partial<Parameters<typeof ReviewForm>[0]> = {}) {
  const submit = vi.fn<ReviewSubmit>(() => Promise.resolve({ ok: true, id: 'review-1' }));
  const view = render(<ReviewForm policyHref={policyHrefFixture} submit={submit} {...props} />);

  return { submit, ...view };
}

const submitButton = () => screen.getByRole('button', { name: texts.submit });
const fiveStars = () => screen.getByRole('radio', { name: 'Оценка 5 из 5' });

/** Заполняет имя и текст. Оценка и согласие ставятся отдельно — они предмет проверок. */
async function fillTexts(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText(/Имя/), 'Ирина');
  await user.type(screen.getByLabelText(/Отзыв/), REVIEW_TEXT);
}

describe('ReviewForm', () => {
  it('🔴 без оценки не отправляется и объясняет, что нужно поставить звёзды', async () => {
    const user = userEvent.setup();
    const { submit } = setup();

    await fillTexts(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(submit).not.toHaveBeenCalled();
    expect(await screen.findByText(/Поставьте оценку/)).toBeInTheDocument();
    // о проблеме сообщает role="alert", связанный со звёздами: у radio нет aria-invalid
    expect(fiveStars()).toHaveAccessibleDescription(/Поставьте оценку/);
  });

  it('🔴 без согласия на обработку данных не отправляется', async () => {
    const user = userEvent.setup();
    const { submit } = setup();

    await fillTexts(user);
    await user.click(fiveStars());
    await user.click(submitButton());

    expect(submit).not.toHaveBeenCalled();
    expect(await screen.findByText(/согласия/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('слишком короткий отзыв ловится до отправки и ведёт к себе фокус', async () => {
    const user = userEvent.setup();
    const { submit } = setup();

    await user.type(screen.getByLabelText(/Имя/), 'Ирина');
    await user.type(screen.getByLabelText(/Отзыв/), 'Норм');
    await user.click(fiveStars());
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(submit).not.toHaveBeenCalled();

    const text = screen.getByLabelText(/Отзыв/);
    expect(text).toHaveAttribute('aria-invalid', 'true');
    expect(text).toHaveFocus();
  });

  it('🔴 успех сообщает про модерацию, а не про публикацию', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const { submit } = setup({ onSuccess });

    await fillTexts(user);
    await user.click(fiveStars());
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(await screen.findByText(texts.successTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.successModeration)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/модерацию/);
    expect(onSuccess).toHaveBeenCalledWith('review-1');

    const sent = submit.mock.calls[0]?.[0];
    expect(sent?.get('name')).toBe('Ирина');
    expect(sent?.get('rating')).toBe('5');
    expect(sent?.get('text')).toBe(REVIEW_TEXT);
    expect(sent?.get('consent')).toBe('true');
    expect(sent?.has('district')).toBe(false);
  });

  it('ошибка сервера объясняет, что делать, и не стирает написанное', async () => {
    const user = userEvent.setup();
    const submit = vi.fn<ReviewSubmit>(() =>
      Promise.resolve({ ok: false, message: texts.errorRateLimited }),
    );
    setup({ submit });

    await fillTexts(user);
    await user.click(fiveStars());
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(await screen.findByText(texts.errorRateLimited)).toBeInTheDocument();
    expect(screen.getByText(texts.errorRetryLead)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(texts.errorRateLimited);
    // 🔴 запасного пути у отзыва нет — тем важнее, чтобы текст остался в форме
    expect(screen.getByLabelText(/Отзыв/)).toHaveValue(REVIEW_TEXT);
  });

  it('поле-ловушку не видит ни человек, ни скринридер', () => {
    const { container } = setup();
    const trap = container.querySelector('input[name="hp"]');

    expect(trap).not.toBeNull();
    expect(trap?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(trap).toHaveAttribute('tabindex', '-1');
    // в дереве доступности поля нет вовсе — иначе его прочитал бы скринридер
    const exposed = screen.queryAllByRole('textbox').map((field) => field.getAttribute('name'));
    expect(exposed).not.toContain('hp');
  });

  it('🔴 заполненная ловушка означает бота: форма ведёт себя тихо и ничего не отправляет', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup();

    await fillTexts(user);
    await user.click(fiveStars());
    await user.click(screen.getByRole('checkbox'));

    const trap = container.querySelector('input[name="hp"]');
    if (trap === null) throw new Error('Поле-ловушка не найдено');
    fireEvent.change(trap, { target: { value: 'https://spam.example' } });

    await user.click(submitButton());

    expect(submit).not.toHaveBeenCalled();
    expect(await screen.findByText(texts.successTitle)).toBeInTheDocument();
    expect(screen.queryByText(texts.errorUnknown)).not.toBeInTheDocument();
  });

  it('на время отправки кнопка заблокирована', async () => {
    const user = userEvent.setup();
    const submit = vi.fn<ReviewSubmit>(() => new Promise(() => {}));
    setup({ submit });

    await fillTexts(user);
    await user.click(fiveStars());
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await waitFor(() => {
      expect(screen.getByRole('button', { name: texts.submitting })).toBeDisabled();
    });
    expect(screen.getByRole('status')).toHaveTextContent(texts.sendingAnnounce);
  });

  it('после успеха можно написать ещё один отзыв', async () => {
    const user = userEvent.setup();
    setup();

    await fillTexts(user);
    await user.click(fiveStars());
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await user.click(await screen.findByRole('button', { name: texts.successAgain }));

    expect(screen.getByLabelText(/Имя/)).toHaveValue('');
    expect(screen.getByLabelText(/Отзыв/)).toHaveValue('');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(fiveStars()).not.toBeChecked();
  });

  it('заголовок связан с формой и не занимает уровень h1', () => {
    setup({ headingLevel: 3 });

    expect(screen.getByRole('heading', { level: 3, name: texts.title })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: texts.title })).toBeInTheDocument();
  });

  it('🔴 ссылка на политику ведёт из формы — этого требует 152-ФЗ', () => {
    setup();

    expect(screen.getByRole('link', { name: texts.consentPolicy })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });
});
