import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';

import { PricesForm } from './PricesForm';
import { pricesFormContent as texts } from './content';
import { emptyExtras, emptyPrices, failingSave, filledPrices, pendingSave } from './fixtures';
import { putPrices, rowOfField, rowsWithoutClass, toRequestBody } from './lib';

describe('Прайс — тело запроса', () => {
  it('уходит целиком: контракт заменяет таблицу, а не правит строку', () => {
    const body = toRequestBody(filledPrices);

    expect(body.prices).toHaveLength(2);
    expect(body.extras).toEqual(filledPrices.extras);
  });

  it('совсем пустой ряд отбрасывается: его добавила кнопка, а заполнить передумали', () => {
    const body = toRequestBody({
      ...filledPrices,
      prices: [...filledPrices.prices, { cls: '  ', power: '', area: '', price: '', term: '' }],
    });

    expect(body.prices).toHaveLength(2);
  });

  /**
   * 🔴 Раньше эти два случая были одним: фильтр по `cls` отбрасывал и пустой
   * ряд, и ряд с данными. Второй — потеря работы владельца, и молчаливая.
   */
  it('🔴 ряд с данными, но без класса, до тела запроса не доходит — его ловит форма', () => {
    const values = {
      ...filledPrices,
      prices: [...filledPrices.prices, { cls: '', power: '', area: '25', price: '6000', term: '' }],
    };

    expect(rowsWithoutClass(values)).toEqual([2]);
  });

  it('заполненный класс претензий не вызывает', () => {
    expect(rowsWithoutClass(filledPrices)).toEqual([]);
  });

  it('пробелы классом не считаются', () => {
    const values = {
      ...filledPrices,
      prices: [{ cls: '   ', power: '2.6 кВт', area: '25', price: '5500', term: '1 день' }],
    };

    expect(rowsWithoutClass(values)).toEqual([0]);
  });
});

describe('Прайс — адрес отказа сервера', () => {
  it('строка прайса вычленяется из поля контракта', () => {
    expect(rowOfField('prices.3.cls')).toBe(3);
    expect(rowOfField('prices.0.price')).toBe(0);
  });

  it('отказ не про строку прайса адреса не даёт', () => {
    expect(rowOfField('extras.trassaPerM')).toBeNull();
    expect(rowOfField(undefined)).toBeNull();
    expect(rowOfField('')).toBeNull();
    // «prices» без номера — общий отказ по таблице, а не по строке
    expect(rowOfField('prices')).toBeNull();
  });

  it('цены уходят строками — приводит их схема на сервере, и только она', () => {
    const body = toRequestBody(filledPrices);

    expect(Array.isArray(body.prices)).toBe(true);
    expect((body.prices as { price: unknown }[])[0]?.price).toBe('5500');
  });
});

describe('Прайс — отправка', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('сообщение сервера доносится как есть', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { code: 'validation_error', message: 'Хотя бы одна строка' } }),
            { status: 422 },
          ),
      ),
    );

    await expect(putPrices(filledPrices)).resolves.toEqual({
      ok: false,
      message: 'Хотя бы одна строка',
    });
  });

  it('истёкшая сессия объясняется общим текстом панели: своего у фичи нет', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    await expect(putPrices(filledPrices)).resolves.toEqual({
      ok: false,
      message: ADMIN_API_TEXTS.session,
    });
  });

  it('упавшая сеть сообщает, что изменения не сохранены', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    await expect(putPrices(filledPrices)).resolves.toEqual({
      ok: false,
      message: texts.networkError,
    });
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

  /**
   * 🔴 Главная проверка задачи. Раньше такая строка молча не доезжала до
   * сервера, форма отвечала «Сохранено», и владелец уходил в уверенности, что
   * прайс полон.
   */
  it('🔴 строка без класса останавливает отправку, а не теряется', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }));
    const values = {
      ...filledPrices,
      prices: [
        ...filledPrices.prices,
        { cls: '', power: '', area: 'до 35 м²', price: '6500', term: '' },
      ],
    };

    render(<PricesForm values={values} save={save} />);
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).not.toHaveBeenCalled();
    /* По тексту, а не по роли: `alert` здесь два — общая плашка и ошибка у
       ячейки. Это и задумано: сводка объясняет отказ, ячейка показывает, где. */
    expect(await screen.findByText(texts.rowsWithoutClass)).toBeInTheDocument();
    // ошибка стоит у своей ячейки, а не одной плашкой на всю таблицу
    expect(screen.getByLabelText(`${texts.cls} 3`)).toHaveAccessibleDescription(
      texts.rowWithoutClass,
    );
  });

  it('заполненный класс снимает отметку и пропускает отправку', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }));
    const values = {
      ...filledPrices,
      prices: [
        ...filledPrices.prices,
        { cls: '', power: '', area: 'до 35 м²', price: '6500', term: '' },
      ],
    };

    render(<PricesForm values={values} save={save} />);
    await user.click(screen.getByRole('button', { name: texts.save }));
    await user.type(screen.getByLabelText(`${texts.cls} 3`), '12');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('🔴 отказ сервера по строке подсвечивает эту строку', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({
      ok: false,
      message: 'Класс уже есть в прайсе',
      field: 'prices.1.cls',
    }));

    render(<PricesForm values={filledPrices} save={save} />);
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByText('Класс уже есть в прайсе')).toBeInTheDocument();
    expect(screen.getByLabelText(`${texts.cls} 2`)).toHaveAccessibleDescription(
      texts.rowWithoutClass,
    );
    // соседняя строка чистая: отказ адресный, а не общий
    expect(screen.getByLabelText(`${texts.cls} 1`)).not.toHaveAccessibleDescription(
      texts.rowWithoutClass,
    );
  });
});
