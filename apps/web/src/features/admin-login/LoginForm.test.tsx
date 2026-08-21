import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { adminLoginContent as texts } from './content';
import { failedSubmit, pendingSubmit, rateLimitedSubmit } from './fixtures';
import { LoginForm } from './LoginForm';

const navigate = vi.fn();

function renderForm(props: Partial<Parameters<typeof LoginForm>[0]> = {}) {
  return render(<LoginForm redirectTo="/admin" navigate={navigate} {...props} />);
}

describe('Форма входа в панель', () => {
  it('пустую форму не отправляет и показывает, чего не хватает', async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    renderForm({ submit });

    await user.click(screen.getByRole('button', { name: texts.submit }));

    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText('Введите логин')).toBeInTheDocument();
    expect(screen.getByText('Введите пароль')).toBeInTheDocument();
  });

  it('фокус уходит на первое непройденное поле', async () => {
    const user = userEvent.setup();
    renderForm({ submit: vi.fn() });

    await user.click(screen.getByRole('button', { name: texts.submit }));

    expect(screen.getByLabelText(texts.login, { exact: false })).toHaveFocus();
  });

  it('ошибка поля снимается на первом же вводе', async () => {
    const user = userEvent.setup();
    renderForm({ submit: vi.fn() });

    await user.click(screen.getByRole('button', { name: texts.submit }));
    expect(screen.getByText('Введите логин')).toBeInTheDocument();

    await user.type(screen.getByLabelText(texts.login, { exact: false }), 'a');

    expect(screen.queryByText('Введите логин')).not.toBeInTheDocument();
  });

  it('после успешного входа уводит на запрошенный раздел', async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => ({ ok: true }) as const);
    renderForm({ submit, redirectTo: '/admin/catalog' });

    await user.type(screen.getByLabelText(texts.login, { exact: false }), 'admin');
    await user.type(screen.getByLabelText(texts.password, { exact: false }), 'секрет');
    await user.click(screen.getByRole('button', { name: texts.submit }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/admin/catalog');
    });
  });

  it('отказ озвучивается и пароль очищается', async () => {
    const user = userEvent.setup();
    renderForm({ submit: failedSubmit });

    await user.type(screen.getByLabelText(texts.login, { exact: false }), 'admin');
    const password = screen.getByLabelText(texts.password, { exact: false });
    await user.type(password, 'неверный');
    await user.click(screen.getByRole('button', { name: texts.submit }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.failed);
    expect(password).toHaveValue('');
    await waitFor(() => {
      expect(password).toHaveFocus();
    });
  });

  it('перебор объясняет, когда можно повторить', async () => {
    const user = userEvent.setup();
    renderForm({ submit: rateLimitedSubmit });

    await user.type(screen.getByLabelText(texts.login, { exact: false }), 'admin');
    await user.type(screen.getByLabelText(texts.password, { exact: false }), 'секрет');
    await user.click(screen.getByRole('button', { name: texts.submit }));

    expect(await screen.findByRole('alert')).toHaveTextContent('5 мин');
  });

  it('во время отправки кнопка заблокирована, повторная отправка не уходит', async () => {
    const user = userEvent.setup();
    const submit = vi.fn(pendingSubmit);
    renderForm({ submit });

    await user.type(screen.getByLabelText(texts.login, { exact: false }), 'admin');
    await user.type(screen.getByLabelText(texts.password, { exact: false }), 'секрет');

    const button = screen.getByRole('button', { name: texts.submit });
    await user.click(button);

    // Подпись подменяется на время отправки — кнопка та же, имя другое.
    const sending = await screen.findByRole('button', { name: texts.sending });
    expect(sending).toBeDisabled();

    await user.click(sending);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
