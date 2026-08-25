import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProfileForm } from './ProfileForm';
import { profileFormContent as texts } from './content';
import { acceptingApi, failingApi, installerMe, ownerMe } from './fixtures';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

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
    await user.click(screen.getByRole('button', { name: texts.passwordSubmit }));

    expect(changePassword).toHaveBeenCalledWith({
      current: 'старый-пароль',
      next: 'новый-пароль',
    });
  });

  it('неверный текущий пароль объясняется человеку', async () => {
    const user = userEvent.setup();
    render(<ProfileForm me={ownerMe} api={failingApi} />);

    await user.type(screen.getByLabelText(texts.passwordCurrent), 'не-тот');
    await user.type(screen.getByLabelText(texts.passwordNext), 'новый-пароль');
    await user.click(screen.getByRole('button', { name: texts.passwordSubmit }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Текущий пароль не подошёл');
  });
});
