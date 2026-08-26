import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StaffCardView } from './StaffCardView';
import { staffManagerContent as texts } from './content';
import {
  acceptingApi,
  activeInstaller,
  disabledInstaller,
  failingApi,
  namelessInstaller,
  staffInstaller,
  unsetEmploymentInstaller,
} from './fixtures';
import { employmentTitle } from './model';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

describe('Монтажник в списке команды', () => {
  it('показывает имя, логин и состояние доступа', () => {
    render(<StaffCardView staff={activeInstaller} api={acceptingApi} />);

    expect(screen.getByRole('heading', { name: activeInstaller.name ?? '' })).toBeInTheDocument();
    expect(screen.getByText(`@${activeInstaller.login}`)).toBeInTheDocument();
    expect(screen.getByText(texts.active)).toBeInTheDocument();
  });

  it('без имени показывает логин: пустая карточка ничего не говорит', () => {
    render(<StaffCardView staff={namelessInstaller} api={acceptingApi} />);

    expect(screen.getByRole('heading', { name: namelessInstaller.login })).toBeInTheDocument();
  });

  it('закрывает доступ одним нажатием — из списка, не заходя в карточку', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);
    render(<StaffCardView staff={activeInstaller} api={{ ...acceptingApi, update }} />);

    await user.click(screen.getByRole('button', { name: texts.disable }));

    expect(update).toHaveBeenCalledWith('u2', { active: false });
  });

  it('закрытому доступу предлагает обратное действие', () => {
    render(<StaffCardView staff={disabledInstaller} api={acceptingApi} />);

    expect(screen.getByRole('button', { name: texts.enable })).toBeInTheDocument();
    expect(screen.getByText(texts.inactive)).toBeInTheDocument();
  });

  it('отказ сервера показывается человеку, а не теряется', async () => {
    const user = userEvent.setup();
    render(<StaffCardView staff={activeInstaller} api={failingApi} />);

    await user.click(screen.getByRole('button', { name: texts.disable }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Такой логин уже занят');
  });

  it('показывает оформление плашкой: от него зависят деньги в наряде', () => {
    render(<StaffCardView staff={staffInstaller} api={acceptingApi} />);

    expect(screen.getByText(employmentTitle('staff'))).toBeInTheDocument();
  });

  it('🔴 незаведённое оформление помечено и объяснено, а не показано пустотой', () => {
    render(<StaffCardView staff={unsetEmploymentInstaller} api={acceptingApi} />);

    expect(screen.getByText(texts.employmentUnset)).toBeInTheDocument();
    /* Владелец должен прочитать последствие прямо в списке: пока оформления
       нет, наряд не уменьшает вознаграждение. */
    expect(screen.getByText(texts.employmentUnsetHint)).toBeInTheDocument();
  });

  it('у заведённого оформления предупреждения нет', () => {
    render(<StaffCardView staff={activeInstaller} api={acceptingApi} />);

    expect(screen.queryByText(texts.employmentUnsetHint)).not.toBeInTheDocument();
  });

  it('ведёт в карточку монтажника', () => {
    render(<StaffCardView staff={activeInstaller} api={acceptingApi} />);

    expect(screen.getByRole('link', { name: `${texts.open} →` })).toHaveAttribute(
      'href',
      '/admin/team/u2',
    );
  });
});
