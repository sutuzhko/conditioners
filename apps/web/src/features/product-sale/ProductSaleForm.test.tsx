import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProductSaleForm } from './ProductSaleForm';
import { productSaleContent as texts } from './content';
import {
  activeSale,
  failingSave,
  higherThanBase,
  nowFixture,
  pendingSave,
  priceFixture,
} from './fixtures';
import { emptySaleValues } from './model';

function renderForm(props: Partial<Parameters<typeof ProductSaleForm>[0]> = {}) {
  return render(
    <ProductSaleForm
      priceNum={priceFixture}
      values={emptySaleValues}
      save={vi.fn()}
      now={nowFixture}
      {...props}
    />,
  );
}

describe('Форма скидки', () => {
  it('🔴 поля процента нет: его можно только вычислить (инвариант 14)', () => {
    renderForm({ values: activeSale });

    expect(screen.queryByLabelText(/процент/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/%/)).not.toBeInTheDocument();
  });

  it('показывает то же, что увидит посетитель', () => {
    renderForm({ values: activeSale });

    expect(screen.getByText(/−9%/)).toBeInTheDocument();
    expect(screen.getByText(/34 900/)).toBeInTheDocument();
  });

  it('предупреждает, когда цена не ниже обычной', () => {
    renderForm({ values: higherThanBase });

    expect(screen.getByText(texts.priceTooHigh)).toBeInTheDocument();
    expect(screen.queryByText(/На сайте/)).not.toBeInTheDocument();
  });

  it('предпросмотр пересчитывается по ходу ввода', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.queryByText(/На сайте/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(new RegExp(texts.salePrice)), '19250');

    // ровно половина от 38 500
    expect(screen.getByText(/−50%/)).toBeInTheDocument();
  });

  it('снятие скидки очищает поля и отправляет пустую цену', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }));
    renderForm({ values: activeSale, save });

    await user.click(screen.getByRole('button', { name: texts.clear }));

    expect(save).toHaveBeenCalledWith(emptySaleValues);
  });

  it('снимать нечего, когда скидки нет', () => {
    renderForm();

    expect(screen.queryByRole('button', { name: texts.clear })).not.toBeInTheDocument();
  });

  it('во время сохранения поля заблокированы', async () => {
    const user = userEvent.setup();
    renderForm({ values: activeSale, save: pendingSave });

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('button', { name: texts.saving })).toBeDisabled();
    expect(screen.getByLabelText(new RegExp(texts.salePrice))).toBeDisabled();
  });

  it('отказ сервера объясняется', async () => {
    const user = userEvent.setup();
    renderForm({ values: activeSale, save: failingSave });

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.serverError);
  });
});
