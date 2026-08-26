import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { StaffAccountForm } from './StaffAccountForm';
import { staffManagerContent as texts } from './content';
import {
  acceptingApi,
  activeInstaller,
  fieldRefusingApi,
  staffInstaller,
  unsetEmploymentInstaller,
} from './fixtures';
import { employmentTitle, staffTitle } from './model';

describe('Учётная запись монтажника — удаление', () => {
  it('🔴 спрашивает окном панели, а не системным confirm', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);

    render(<StaffAccountForm staff={activeInstaller} api={{ ...acceptingApi, remove }} />);
    await user.click(screen.getByRole('button', { name: texts.remove }));

    /* Окно есть в разметке — без него обещание не разрешится и удаление молча
       не случится. Учётная запись из необратимых действий самое дорогое:
       системное окно выглядело для неё так же, как для «удалить фотографию». */
    const request = texts.removeConfirm(staffTitle(activeInstaller));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(request.title);
    expect(dialog).toHaveAccessibleDescription(request.description ?? '');
    expect(remove).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: request.confirmLabel }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(activeInstaller.id));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/team'));
  });

  it('отказ от подтверждения ничего не удаляет', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);

    render(
      <StaffAccountForm
        staff={activeInstaller}
        api={{ ...acceptingApi, remove }}
        confirmRemove={async () => false}
      />,
    );
    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(remove).not.toHaveBeenCalled();
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

  it('🔴 отказ с названием поля подсвечивает поле, а не прячется под форму', async () => {
    const user = userEvent.setup();
    render(<StaffAccountForm staff={activeInstaller} api={fieldRefusingApi} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    const login = await screen.findByLabelText(texts.login);
    await waitFor(() => expect(login).toHaveAttribute('aria-invalid', 'true'));
    expect(login).toHaveAccessibleDescription(/Такой логин уже занят/);
  });
});
