import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProfileForm } from './ProfileForm';
import { profileFormContent as texts } from './content';
import { acceptingApi, failingApi, installerMe, neverLoggedInMe, ownerMe } from './fixtures';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

describe('Профиль', () => {
  it('🔴 логин показывается, но не правится: его выдаёт владелец', () => {
    render(<ProfileForm me={ownerMe} api={acceptingApi} />);

    expect(screen.getByLabelText(texts.login)).toHaveAttribute('readonly');
  });

  it('роль подписана — монтажник должен видеть, кем он вошёл', () => {
    render(<ProfileForm me={installerMe} api={acceptingApi} />);

    expect(screen.getByText(texts.roleTitle('installer'))).toBeInTheDocument();
  });

  it('сохраняет имя и телефон', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<ProfileForm me={ownerMe} api={{ ...acceptingApi, save }} />);

    await user.clear(screen.getByLabelText(texts.name));
    await user.type(screen.getByLabelText(texts.name), 'Алексей Петров');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith({ name: 'Алексей Петров', phone: ownerMe.phone });
  });

  it('🔴 смена пароля требует текущий', async () => {
    const user = userEvent.setup();
    const changePassword = vi.fn(async () => ({ ok: true }) as const);
    render(<ProfileForm me={ownerMe} api={{ ...acceptingApi, changePassword }} />);

    await user.type(screen.getByLabelText(texts.passwordCurrent), 'старый-пароль');
    await user.type(screen.getByLabelText(texts.passwordNext), 'новый-пароль');
    await user.type(screen.getByLabelText(texts.passwordRepeat), 'новый-пароль');
    await user.click(screen.getByRole('button', { name: texts.passwordSubmit }));

    expect(changePassword).toHaveBeenCalledWith({
      current: 'старый-пароль',
      next: 'новый-пароль',
    });
  });

  it('🔴 разошедшийся повтор не уходит на сервер: опечатка стоила бы доступа', async () => {
    const user = userEvent.setup();
    const changePassword = vi.fn(async () => ({ ok: true }) as const);
    render(<ProfileForm me={ownerMe} api={{ ...acceptingApi, changePassword }} />);

    await user.type(screen.getByLabelText(texts.passwordCurrent), 'старый-пароль');
    await user.type(screen.getByLabelText(texts.passwordNext), 'новый-пароль');
    await user.type(screen.getByLabelText(texts.passwordRepeat), 'новый-паролль');
    await user.click(screen.getByRole('button', { name: texts.passwordSubmit }));

    expect(changePassword).not.toHaveBeenCalled();
    expect(await screen.findByText(texts.passwordMismatch)).toBeInTheDocument();
  });

  it('несовпадение объясняется у своего поля, а не строкой сверху', async () => {
    const user = userEvent.setup();
    render(<ProfileForm me={ownerMe} api={acceptingApi} />);

    const repeat = screen.getByLabelText(texts.passwordRepeat);
    await user.type(screen.getByLabelText(texts.passwordNext), 'новый-пароль');
    await user.type(repeat, 'другой-пароль');
    await user.tab();

    expect(repeat).toHaveAttribute('aria-invalid', 'true');
    expect(repeat).toHaveAccessibleDescription(texts.passwordMismatch);
  });

  it('неверный текущий пароль объясняется человеку', async () => {
    const user = userEvent.setup();
    render(<ProfileForm me={ownerMe} api={failingApi} />);

    await user.type(screen.getByLabelText(texts.passwordCurrent), 'не-тот');
    await user.type(screen.getByLabelText(texts.passwordNext), 'новый-пароль');
    await user.type(screen.getByLabelText(texts.passwordRepeat), 'новый-пароль');
    await user.click(screen.getByRole('button', { name: texts.passwordSubmit }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Текущий пароль не подошёл');
  });

  it('дата последнего входа показывается настоящей', () => {
    render(<ProfileForm me={ownerMe} api={acceptingApi} />);

    expect(screen.getByText(texts.lastLoginValue(ownerMe.lastLoginAt))).toBeInTheDocument();
  });

  it('🔴 без единого входа дата не выдумывается', () => {
    render(<ProfileForm me={neverLoggedInMe} api={acceptingApi} />);

    expect(screen.getByText(texts.lastLoginValue(null))).toBeInTheDocument();
  });

  it('🔴 выход на всех устройствах спрашивает подтверждение', async () => {
    const user = userEvent.setup();
    const logoutEverywhere = vi.fn(async () => ({ ok: true }) as const);
    render(<ProfileForm me={ownerMe} api={{ ...acceptingApi, logoutEverywhere }} />);

    await user.click(screen.getByRole('button', { name: texts.logoutAll }));

    expect(logoutEverywhere).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: texts.logoutAllConfirm }));

    expect(logoutEverywhere).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent(texts.logoutAllDone);
  });

  it('отказ от подтверждения не закрывает ничего', async () => {
    const user = userEvent.setup();
    const logoutEverywhere = vi.fn(async () => ({ ok: true }) as const);
    render(<ProfileForm me={ownerMe} api={{ ...acceptingApi, logoutEverywhere }} />);

    await user.click(screen.getByRole('button', { name: texts.logoutAll }));
    await user.click(await screen.findByRole('button', { name: texts.logoutAllCancel }));

    expect(logoutEverywhere).not.toHaveBeenCalled();
  });
});
