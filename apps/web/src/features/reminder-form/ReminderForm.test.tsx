import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReminderForm, type ReminderSubmit } from './ReminderForm';
import { reminderFormContent as texts } from './content';
import { phoneFixture, policyHrefFixture } from './fixtures';

const PHONE = '+79051234567';
/** Что уходит на сервер: маска приводит набранное к одному виду. */
const MASKED_PHONE = '+7 (905) 123-45-67';

function setup(props: Partial<Parameters<typeof ReminderForm>[0]> = {}) {
  const submit = vi.fn<ReminderSubmit>(() => Promise.resolve({ ok: true, id: 'lead-1' }));
  const view = render(<ReminderForm policyHref={policyHrefFixture} submit={submit} {...props} />);

  return { submit, ...view };
}

const submitButton = () => screen.getByRole('button', { name: texts.submit });
const consentBox = () => screen.getByRole('checkbox');

/** Поля запроса из отправленной формы: сервер читает именно их. */
function fieldsOf(data: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of data.entries()) {
    if (typeof value === 'string') result[key] = value;
  }
  return result;
}

describe('ReminderForm', () => {
  it('🔴 без согласия не отправляется: телефон — персональные данные (инвариант 12)', async () => {
    const user = userEvent.setup();
    const { submit } = setup();

    await user.type(screen.getByLabelText(/Телефон/), PHONE);
    await user.click(submitButton());

    expect(submit).not.toHaveBeenCalled();
    expect(consentBox()).toHaveAccessibleDescription(/обработк/i);
  });

  it('🔴 без телефона не отправляется — напоминать некуда', async () => {
    const user = userEvent.setup();
    const { submit } = setup();

    await user.click(consentBox());
    await user.click(submitButton());

    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Телефон/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('отправляет телефон, срок и согласие', async () => {
    const user = userEvent.setup();
    const { submit } = setup();

    await user.type(screen.getByLabelText(/Телефон/), PHONE);
    await user.selectOptions(screen.getByLabelText(texts.whenLabel), 'Стоит больше двух лет');
    await user.click(consentBox());
    await user.click(submitButton());

    expect(submit).toHaveBeenCalledTimes(1);

    const sent = fieldsOf(submit.mock.calls[0]?.[0] as FormData);
    expect(sent.phone).toBe(MASKED_PHONE);
    expect(sent.when).toBe('Стоит больше двух лет');
    expect(sent.consent).toBe('true');
  });

  it('после отправки показывает подтверждение и предлагает добавить ещё номер', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText(/Телефон/), PHONE);
    await user.click(consentBox());
    await user.click(submitButton());

    expect(await screen.findByText(texts.successTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.successText)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: texts.successAgain }));
    expect(screen.getByLabelText(/Телефон/)).toHaveValue('');
  });

  it('🔴 ошибка сервера объясняет, что делать, и оставляет телефон запасным путём', async () => {
    const user = userEvent.setup();
    const submit = vi.fn<ReminderSubmit>(() =>
      Promise.resolve({ ok: false, message: texts.errorRateLimited }),
    );
    render(<ReminderForm policyHref={policyHrefFixture} phone={phoneFixture} submit={submit} />);

    await user.type(screen.getByLabelText(/Телефон/), PHONE);
    await user.click(consentBox());
    await user.click(submitButton());

    /* Сообщение появляется дважды: в видимом блоке и в области объявления
       для скринридера — форма обязана сказать об ошибке и голосом тоже. */
    const shown = await screen.findAllByText(texts.errorRateLimited);
    expect(shown.length).toBeGreaterThan(0);
    expect(screen.getByText(/Не получается/).textContent).toContain(phoneFixture);
  });

  it('без телефона компании запасной строки нет — выдумывать номер нельзя', async () => {
    const user = userEvent.setup();
    const submit = vi.fn<ReminderSubmit>(() =>
      Promise.resolve({ ok: false, message: texts.errorUnknown }),
    );
    const { container } = render(<ReminderForm policyHref={policyHrefFixture} submit={submit} />);

    await user.type(screen.getByLabelText(/Телефон/), PHONE);
    await user.click(consentBox());
    await user.click(submitButton());

    const shown = await screen.findAllByText(texts.errorUnknown);
    expect(shown.length).toBeGreaterThan(0);
    // «позвоните нам» есть в самом тексте ошибки — ищем именно строку с номером
    expect(container.textContent).not.toContain(phoneFixture);
    expect(container.textContent).not.toMatch(/Не получается/);
  });

  it('🔴 заполненная ловушка не уходит на сервер, но и не выдаёт себя', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup();

    const trap = container.querySelector<HTMLInputElement>('input[name="hp"]');
    expect(trap).not.toBeNull();
    if (trap === null) return;

    await user.type(screen.getByLabelText(/Телефон/), PHONE);
    await user.click(consentBox());
    fireHoneypot(trap);
    await user.click(submitButton());

    expect(submit).not.toHaveBeenCalled();
    // бот видит тот же успех, что и человек: иначе он поймёт, где ловушка
    expect(await screen.findByText(texts.successTitle)).toBeInTheDocument();
  });

  it('пока запрос в пути, кнопка заблокирована и говорит об отправке', async () => {
    const user = userEvent.setup();
    const submit = vi.fn<ReminderSubmit>(() => new Promise(() => {}));
    render(<ReminderForm policyHref={policyHrefFixture} submit={submit} />);

    await user.type(screen.getByLabelText(/Телефон/), PHONE);
    await user.click(consentBox());
    await user.click(submitButton());

    const sending = await screen.findByRole('button', { name: texts.submitting });
    expect(sending).toBeDisabled();
  });
});

/** Ловушку заполняет робот, а не человек: обходим userEvent намеренно. */
function fireHoneypot(input: HTMLInputElement): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, 'бот');
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
