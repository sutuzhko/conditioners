import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PricesForm } from './PricesForm';
import { pricesFormContent as texts } from './content';
import { emptyExtras, emptyPrices, failingSave, filledPrices, pendingSave } from './fixtures';
import { toRequestBody } from './lib';

describe('Прайс — тело запроса', () => {
  it('уходит целиком: контракт заменяет таблицу, а не правит строку', () => {
    const body = toRequestBody(filledPrices);

    expect(body.prices).toHaveLength(2);
    expect(body.extras).toEqual(filledPrices.extras);
  });

  it('строка без класса отбрасывается: на сайте это ряд прайса без цены', () => {
    const body = toRequestBody({
      ...filledPrices,
      prices: [...filledPrices.prices, { cls: '  ', power: '', area: '', price: '', term: '' }],
    });

    expect(body.prices).toHaveLength(2);
  });

  it('цены уходят строками — приводит их схема на сервере, и только она', () => {
    const body = toRequestBody(filledPrices);

    expect(Array.isArray(body.prices)).toBe(true);
    expect((body.prices as { price: unknown }[])[0]?.price).toBe('5500');
  });
});

describe('Форма цен', () => {
  it('правка строки уходит на сервер', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }));
    render(<PricesForm values={filledPrices} save={save} />);

    const price = screen.getByLabelText(`${texts.price} 1`);
    await user.clear(price);
    await user.type(price, '5900');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        prices: expect.arrayContaining([expect.objectContaining({ cls: '07', price: '5900' })]),
      }),
    );
  });

  it('строка добавляется в конец и удаляется по своей подписи', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }));
    render(<PricesForm values={filledPrices} save={save} />);

    await user.click(screen.getByRole('button', { name: texts.rowAdd }));
    await user.type(screen.getByLabelText(`${texts.cls} 3`), '12');
    await user.click(screen.getByRole('button', { name: texts.rowRemove(1) }));
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        prices: [expect.objectContaining({ cls: '09' }), expect.objectContaining({ cls: '12' })],
      }),
    );
  });

  it('🔴 незаданная ставка остаётся пустой, а не превращается в ноль', () => {
    render(<PricesForm values={emptyExtras} save={vi.fn()} />);

    expect(screen.getByLabelText(new RegExp(texts.trassaPerM))).toHaveValue(null);
  });

  it('пустой прайс предупреждает о последствии', () => {
    render(<PricesForm values={emptyPrices} save={vi.fn()} />);

    expect(screen.getByText(texts.rowsEmpty)).toBeInTheDocument();
  });

  it('после сохранения сообщает, что калькулятор уже считает по новым цифрам', async () => {
    const user = userEvent.setup();
    render(<PricesForm values={filledPrices} save={async () => ({ ok: true })} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('status')).toHaveTextContent(texts.saved);
  });

  it('во время сохранения поля заблокированы', async () => {
    const user = userEvent.setup();
    render(<PricesForm values={filledPrices} save={pendingSave} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('button', { name: texts.saving })).toBeDisabled();
    expect(screen.getByLabelText(`${texts.price} 1`)).toBeDisabled();
  });

  it('отказ сервера объясняется', async () => {
    const user = userEvent.setup();
    render(<PricesForm values={filledPrices} save={failingSave} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('alert')).toHaveTextContent('хотя бы одна строка');
  });
});
