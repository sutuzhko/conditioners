import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { StaffAccountForm } from './StaffAccountForm';
import { staffManagerContent as texts } from './content';
import {
  acceptingApi,
  activeInstaller,
  fieldRefusingApi,
  selfEmployedNoInn,
  staffInstaller,
  unsetEmploymentInstaller,
} from './fixtures';
import { employmentTitle, staffTitle } from './model';

describe('Учётная запись монтажника — ИНН', () => {
  it('показывает заведённый номер, а не пустое поле', () => {
    render(<StaffAccountForm staff={activeInstaller} api={acceptingApi} />);

    expect(screen.getByLabelText(texts.inn)).toHaveValue(activeInstaller.inn ?? '');
  });

  it('🔴 самозанятый без ИНН предупреждается, но сохранению это не мешает', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(<StaffAccountForm staff={selfEmployedNoInn} api={{ ...acceptingApi, update }} />);

    expect(screen.getByText(texts.innMissing)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: texts.save }));

    /* Предупреждение, а не запрет: договор с человеком знает владелец. */
    await waitFor(() => expect(update).toHaveBeenCalled());
  });

  it('заполненный ИНН убирает предупреждение ещё до сохранения', async () => {
    const user = userEvent.setup();
    render(<StaffAccountForm staff={selfEmployedNoInn} api={acceptingApi} />);

    await user.type(screen.getByLabelText(texts.inn), '710703123450');

    expect(screen.queryByText(texts.innMissing)).not.toBeInTheDocument();
  });

  it('выбор самозанятости у человека без ИНН поднимает предупреждение сразу', async () => {
    const user = userEvent.setup();
    render(<StaffAccountForm staff={unsetEmploymentInstaller} api={acceptingApi} />);

    expect(screen.queryByText(texts.innMissing)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(texts.employment), 'self_employed');

    expect(screen.getByText(texts.innMissing)).toBeInTheDocument();
  });

  it('введённый номер доходит до сервера', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(<StaffAccountForm staff={selfEmployedNoInn} api={{ ...acceptingApi, update }} />);

    await user.type(screen.getByLabelText(texts.inn), '710703123450');
    await user.click(screen.getByRole('button', { name: texts.save }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        selfEmployedNoInn.id,
        expect.objectContaining({ inn: '710703123450' }),
      ),
    );
  });
});

describe('Учётная запись монтажника — оформление', () => {
  it('показывает текущее оформление человека, а не пустой выбор', () => {
    render(<StaffAccountForm staff={staffInstaller} api={acceptingApi} />);

    expect(screen.getByLabelText(texts.employment)).toHaveValue('staff');
  });

  it('🔴 не заведено — выбор пустой: значение за владельца не подставляется', () => {
    render(<StaffAccountForm staff={unsetEmploymentInstaller} api={acceptingApi} />);

    expect(screen.getByLabelText(texts.employment)).toHaveValue('');
    expect(screen.getByText(texts.employmentUnsetHint)).toBeInTheDocument();
  });

  it('объясняет последствие выбранного оформления, а не называет его', async () => {
    const user = userEvent.setup();
    render(<StaffAccountForm staff={unsetEmploymentInstaller} api={acceptingApi} />);

    await user.selectOptions(screen.getByLabelText(texts.employment), 'staff');

    /* У работника по трудовому договору удержание не уменьшает выплату —
       владелец должен прочитать это до сохранения, а не узнать из наряда. */
    expect(screen.getByText(texts.employmentHint('staff'))).toBeInTheDocument();
    expect(screen.queryByText(texts.employmentUnsetHint)).not.toBeInTheDocument();
  });

  it('сохраняет выбранное оформление', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(<StaffAccountForm staff={unsetEmploymentInstaller} api={{ ...acceptingApi, update }} />);

    await user.selectOptions(screen.getByLabelText(texts.employment), 'contract');
    await user.click(screen.getByRole('button', { name: texts.save }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        unsetEmploymentInstaller.id,
        expect.objectContaining({ employment: 'contract' }),
      ),
    );
  });

  it('оформление снимается обратно: пустой пункт выбираем руками', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(<StaffAccountForm staff={staffInstaller} api={{ ...acceptingApi, update }} />);

    await user.selectOptions(screen.getByLabelText(texts.employment), '');
    await user.click(screen.getByRole('button', { name: texts.save }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        staffInstaller.id,
        expect.objectContaining({ employment: '' }),
      ),
    );
  });

  it('все три вида оформления доступны для выбора', () => {
    render(<StaffAccountForm staff={activeInstaller} api={acceptingApi} />);

    const select = screen.getByLabelText(texts.employment);
    for (const employment of ['self_employed', 'contract', 'staff'] as const) {
      expect(
        within(select).getByRole('option', { name: employmentTitle(employment) }),
      ).toBeInTheDocument();
    }
    expect(within(select).getByRole('option', { name: texts.employmentEmpty })).toBeInTheDocument();
  });

  it('🔴 перевод с трудового договора на самозанятость спрашивает подтверждение', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(<StaffAccountForm staff={staffInstaller} api={{ ...acceptingApi, update }} />);

    await user.selectOptions(screen.getByLabelText(texts.employment), 'self_employed');
    await user.click(screen.getByRole('button', { name: texts.save }));

    /* Услуги бывшему работодателю под НПД закрыты на два года (ФЗ-422):
       владелец обязан прочитать это до сохранения, а не узнать от бухгалтера. */
    const request = texts.employmentSwitchConfirm(staffTitle(staffInstaller));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(request.title);
    expect(dialog).toHaveAccessibleDescription(request.description ?? '');
    expect(update).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: request.confirmLabel }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        staffInstaller.id,
        expect.objectContaining({ employment: 'self_employed' }),
      ),
    );
  });

  it('🔴 отказ от подтверждения ничего не сохраняет', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(
      <StaffAccountForm
        staff={staffInstaller}
        api={{ ...acceptingApi, update }}
        confirmEmployment={async () => false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(texts.employment), 'self_employed');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(update).not.toHaveBeenCalled();
  });

  it('остальные переходы оформления не спрашивают: закрыт только НПД у бывшего работника', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(<StaffAccountForm staff={staffInstaller} api={{ ...acceptingApi, update }} />);

    await user.selectOptions(screen.getByLabelText(texts.employment), 'contract');
    await user.click(screen.getByRole('button', { name: texts.save }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        staffInstaller.id,
        expect.objectContaining({ employment: 'contract' }),
      ),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('🔴 отказ с названием поля подсвечивает поле, а не прячется под форму', async () => {
    const user = userEvent.setup();
    render(<StaffAccountForm staff={activeInstaller} api={fieldRefusingApi} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    const login = await screen.findByLabelText(texts.login);
    await waitFor(() => expect(login).toHaveAttribute('aria-invalid', 'true'));
    expect(login).toHaveAccessibleDescription(/Такой логин уже занят/);
  });
});
