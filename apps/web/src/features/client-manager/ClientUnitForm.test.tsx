import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ClientUnitForm } from './ClientUnitForm';
import { clientManagerContent as texts } from './content';
import { acceptingUnitApi, failingUnitApi, unit } from './fixtures';

describe('Форма техники клиента', () => {
  it('заводит запись руками и очищает поля: техники бывает несколько', async () => {
    const user = userEvent.setup();
    const create = vi.fn(async () => ({ ok: true }) as const);

    render(<ClientUnitForm clientId="c1" api={{ ...acceptingUnitApi, create }} />);

    await user.type(screen.getByLabelText(texts.unitModel), 'Сплит-система 07');

    /* 🔴 Дата набирается сегментами (кит, `DateField`): нативное поле рисуется
       в локали браузера, и на английской машине владелец задал бы месяц
       вместо дня (issue #586). В теле запроса та же строка ISO. */
    const installed = screen.getByRole('group', { name: texts.unitInstalledAt });
    await user.type(within(installed).getByLabelText('День'), '01');
    await user.type(within(installed).getByLabelText('Месяц'), '06');
    await user.type(within(installed).getByLabelText('Год'), '2019');

    await user.click(screen.getByRole('button', { name: texts.unitSave }));

    expect(create).toHaveBeenCalledWith('c1', {
      model: 'Сплит-система 07',
      installedAt: '2019-06-01',
      /* Гарантия не записана — это рабочее состояние, а не сегодняшнее число. */
      warrantyUntil: '',
    });
    expect(screen.getByLabelText(texts.unitModel)).toHaveValue('');
  });

  it('правка подставляет даты записи днями, а не моментами', () => {
    render(<ClientUnitForm clientId="c1" unit={unit} api={acceptingUnitApi} />);

    const installed = screen.getByRole('group', { name: texts.unitInstalledAt });
    expect(within(installed).getByLabelText('День')).toHaveValue('14');
    expect(within(installed).getByLabelText('Месяц')).toHaveValue('07');
    expect(within(installed).getByLabelText('Год')).toHaveValue('2026');

    const warranty = screen.getByRole('group', { name: texts.unitWarrantyUntil });
    expect(within(warranty).getByLabelText('День')).toHaveValue('14');
    expect(within(warranty).getByLabelText('Месяц')).toHaveValue('07');
    expect(within(warranty).getByLabelText('Год')).toHaveValue('2029');
  });

  it('правка отправляет номер записи и оставляет введённое на месте', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(<ClientUnitForm clientId="c1" unit={unit} api={{ ...acceptingUnitApi, update }} />);
    await user.click(screen.getByRole('button', { name: texts.unitSave }));

    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      model: 'Сплит-система 09',
      installedAt: '2026-07-14',
      warrantyUntil: '2029-07-14',
    });
    expect(screen.getByLabelText(texts.unitModel)).toHaveValue('Сплит-система 09');
  });

  it('🔴 названное сервером поле подсвечивается, а не прячется в общей ошибке', async () => {
    const user = userEvent.setup();

    render(<ClientUnitForm clientId="c1" api={failingUnitApi} />);

    await user.type(screen.getByLabelText(texts.unitModel), 'Сплит-система 07');
    await user.click(screen.getByRole('button', { name: texts.unitSave }));

    expect(await screen.findByText('Укажите дату монтажа')).toBeInTheDocument();

    /* `aria-invalid` живёт на сегменте, а не на группе: роль `group` этого
       атрибута не поддерживает вовсе, и озвучка его там не читает. */
    const installed = screen.getByRole('group', { name: texts.unitInstalledAt });
    expect(within(installed).getByLabelText('День')).toHaveAttribute('aria-invalid', 'true');
  });

  it('отмена показывается только там, где есть куда возвращаться', () => {
    const { rerender } = render(<ClientUnitForm clientId="c1" api={acceptingUnitApi} />);
    expect(screen.queryByRole('button', { name: texts.unitCancel })).not.toBeInTheDocument();

    rerender(<ClientUnitForm clientId="c1" api={acceptingUnitApi} onCancel={() => undefined} />);
    expect(screen.getByRole('button', { name: texts.unitCancel })).toBeInTheDocument();
  });
});
