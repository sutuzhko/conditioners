import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderResultForm } from './OrderResultForm';
import { orderManagerContent as texts } from './content';
import { acceptingWorkApi, failingWorkApi, orderDetails, pendingWorkApi } from './fixtures';

const empty = { extraWork: null, report: null, resultAt: null } as const;

describe('Итог работ', () => {
  it('пустой итог говорит об этом словами, а не пустотой', () => {
    render(<OrderResultForm api={acceptingWorkApi} {...empty} />);

    expect(screen.getByText(texts.resultEmpty)).toBeInTheDocument();
  });

  it('заполненный итог показывает дату с сервера', () => {
    render(
      <OrderResultForm
        api={acceptingWorkApi}
        extraWork={orderDetails.extraWork}
        report={orderDetails.report}
        resultAt={orderDetails.resultAt}
      />,
    );

    expect(screen.getByLabelText(texts.report)).toHaveValue(orderDetails.report);
    expect(screen.getByText(/Заполнен/)).toBeInTheDocument();
  });

  it('🔴 плановых полей в форме нет: цену заказа решает владелец в наряде', () => {
    render(<OrderResultForm api={acceptingWorkApi} {...empty} />);

    expect(screen.queryByLabelText(texts.price)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(texts.installerFee)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(texts.deduction)).not.toBeInTheDocument();
  });

  it('отправляет то, что ввели, и сообщает об успехе', async () => {
    const api = { ...acceptingWorkApi, saveResult: vi.fn(async () => ({ ok: true as const })) };
    const onSaved = vi.fn();

    render(<OrderResultForm api={api} {...empty} onSaved={onSaved} />);

    await userEvent.type(screen.getByLabelText(texts.extraWork), 'Два метра трассы');
    await userEvent.click(screen.getByRole('button', { name: texts.resultSave }));

    await waitFor(() => {
      expect(api.saveResult).toHaveBeenCalledWith({ extraWork: 'Два метра трассы', report: '' });
    });
    expect(await screen.findByText(texts.resultSaved)).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalled();
  });

  it('на время отправки кнопка занята', async () => {
    render(<OrderResultForm api={pendingWorkApi} {...empty} />);

    await userEvent.type(screen.getByLabelText(texts.report), 'Готово');
    await userEvent.click(screen.getByRole('button', { name: texts.resultSave }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: texts.resultSaving })).toBeDisabled();
    });
  });

  it('отказ сервера объясняется, а введённое не пропадает', async () => {
    render(<OrderResultForm api={failingWorkApi} {...empty} />);

    await userEvent.type(screen.getByLabelText(texts.report), 'Готово');
    await userEvent.click(screen.getByRole('button', { name: texts.resultSave }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText(texts.report)).toHaveValue('Готово');
  });

  it('отключённая форма не отправляется', async () => {
    const api = { ...acceptingWorkApi, saveResult: vi.fn(async () => ({ ok: true as const })) };

    render(<OrderResultForm api={api} {...empty} disabled />);

    await userEvent.click(screen.getByRole('button', { name: texts.resultSave }));

    expect(api.saveResult).not.toHaveBeenCalled();
  });
});
