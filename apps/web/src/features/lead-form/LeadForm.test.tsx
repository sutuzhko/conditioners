import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LeadForm } from './LeadForm';
import { leadFormContent as texts } from './content';
import { phoneFixture, policyHrefFixture } from './fixtures';
import type { LeadSubmit } from './model';

function setup(props: Partial<Parameters<typeof LeadForm>[0]> = {}) {
  const submit = vi.fn<LeadSubmit>(() => Promise.resolve({ ok: true, id: 'lead-1' }));
  const view = render(
    <LeadForm phone={phoneFixture} policyHref={policyHrefFixture} submit={submit} {...props} />,
  );

  return { submit, ...view };
}

/** Заполняет обязательные поля. Согласие ставится отдельно — оно и есть предмет проверки. */
async function fillRequired(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText(/Имя/), 'Ирина');
  await user.type(screen.getByLabelText(/Телефон/), '+7 900 123-45-67');
}

const submitButton = () => screen.getByRole('button', { name: texts.submit });

describe('LeadForm', () => {
  it('без согласия на обработку данных не отправляется', async () => {
    const user = userEvent.setup();
    const { submit } = setup();

    await fillRequired(user);
    await user.click(submitButton());

    expect(submit).not.toHaveBeenCalled();
    expect(await screen.findByText(/согласия/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('ловит некорректный телефон до отправки и ведёт к нему фокус', async () => {
    const user = userEvent.setup();
    const { submit } = setup();

    await user.type(screen.getByLabelText(/Имя/), 'Ирина');
    await user.type(screen.getByLabelText(/Телефон/), '12-34');
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(submit).not.toHaveBeenCalled();

    const phone = screen.getByLabelText(/Телефон/);
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    expect(phone).toHaveFocus();
    expect(screen.getByText('Похоже, в номере не хватает цифр')).toBeInTheDocument();
  });

  it('успешная отправка показывает подтверждение и объявляет его', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const { submit } = setup({ onSuccess });

    await fillRequired(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(await screen.findByText(texts.successTitle)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(texts.successAnnounce);
    expect(onSuccess).toHaveBeenCalledWith('lead-1');

    const sent = submit.mock.calls[0]?.[0];
    expect(sent?.get('name')).toBe('Ирина');
    expect(sent?.get('phone')).toBe('+7 900 123-45-67');
    expect(sent?.get('consent')).toBe('true');
    // 🔴 канонический контракт (docs/API.md §8) называет поле `callTime`, а не `time`
    expect(sent?.has('time')).toBe(false);
  });

  it('ошибка сервера объясняет, что делать, и оставляет телефон', async () => {
    const user = userEvent.setup();
    const submit = vi.fn<LeadSubmit>(() =>
      Promise.resolve({ ok: false, message: texts.errorRateLimited }),
    );
    setup({ submit });

    await fillRequired(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(await screen.findByText(texts.errorRateLimited)).toBeInTheDocument();

    const call = screen.getByRole('link', { name: /\d/ });
    expect(call).toHaveAttribute('href', `tel:${phoneFixture}`);
    expect(screen.getByRole('status')).toHaveTextContent(texts.errorRateLimited);
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

  it('заполненная ловушка означает бота: форма ведёт себя тихо и ничего не отправляет', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup();

    await fillRequired(user);
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
    const submit = vi.fn<LeadSubmit>(() => new Promise(() => {}));
    setup({ submit });

    await fillRequired(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await waitFor(() => {
      expect(screen.getByRole('button', { name: texts.submitting })).toBeDisabled();
    });
    expect(screen.getByRole('status')).toHaveTextContent(texts.sendingAnnounce);
  });

  it('после успеха можно отправить ещё одну заявку', async () => {
    const user = userEvent.setup();
    setup();

    await fillRequired(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await user.click(await screen.findByRole('button', { name: texts.successAgain }));

    expect(screen.getByLabelText(/Имя/)).toHaveValue('');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('заголовок связан с формой и не занимает уровень h1', () => {
    setup({ title: 'Оставьте заявку', headingLevel: 3 });

    expect(screen.getByRole('heading', { level: 3, name: 'Оставьте заявку' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Оставьте заявку' })).toBeInTheDocument();
  });

  it('ссылка на политику ведёт из формы — этого требует 152-ФЗ', () => {
    setup();
    expect(screen.getByRole('link', { name: texts.consentPolicy })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });
});
