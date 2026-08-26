import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProductForm } from './ProductForm';
import { productFormContent as texts } from './content';
import { failingSave, filledProduct, pendingSave, rejectingSave } from './fixtures';
import { emptyProductValues } from './model';

describe('Форма модели каталога', () => {
  it('сохраняет введённые значения', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true, id: 'x' }) as const);
    render(<ProductForm values={filledProduct} save={save} />);

    await user.clear(screen.getByLabelText(new RegExp(texts.priceNum)));
    await user.type(screen.getByLabelText(new RegExp(texts.priceNum)), '39900');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith({ ...filledProduct, priceNum: '39900' });
  });

  it('ошибка сервера показывается у названного им поля', async () => {
    const user = userEvent.setup();
    render(<ProductForm values={filledProduct} save={rejectingSave} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    const price = await screen.findByLabelText(new RegExp(texts.priceNum));
    expect(price).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Цена должна быть больше нуля')).toBeInTheDocument();
  });

  it('отказ без указания поля объясняется над кнопкой', async () => {
    const user = userEvent.setup();
    render(<ProductForm values={filledProduct} save={failingSave} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.serverError);
  });

  it('ошибка поля снимается на первом же вводе', async () => {
    const user = userEvent.setup();
    render(<ProductForm values={filledProduct} save={rejectingSave} />);

    await user.click(screen.getByRole('button', { name: texts.save }));
    expect(await screen.findByText('Цена должна быть больше нуля')).toBeInTheDocument();

    await user.type(screen.getByLabelText(new RegExp(texts.priceNum)), '1');

    expect(screen.queryByText('Цена должна быть больше нуля')).not.toBeInTheDocument();
  });

  it('во время сохранения поля заблокированы', async () => {
    const user = userEvent.setup();
    render(<ProductForm values={filledProduct} save={pendingSave} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('button', { name: texts.saving })).toBeDisabled();
    expect(screen.getByLabelText(new RegExp(texts.name))).toBeDisabled();
  });

  it('у новой модели кнопка называется иначе и удалять нечего', () => {
    render(<ProductForm values={emptyProductValues} save={vi.fn()} isNew />);

    expect(screen.getByRole('button', { name: texts.create })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.remove })).not.toBeInTheDocument();
  });

  it('удаление спрашивает подтверждение и без него ничего не делает', async () => {
    const user = userEvent.setup();
    const remove = vi.fn();
    render(
      <ProductForm
        values={filledProduct}
        save={vi.fn()}
        remove={remove}
        confirmRemove={async () => false}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(remove).not.toHaveBeenCalled();
  });

  it('подтверждённое удаление называет модель по имени', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }));
    const confirmRemove = vi.fn(async () => true);
    render(
      <ProductForm
        values={filledProduct}
        save={vi.fn()}
        remove={remove}
        confirmRemove={confirmRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(confirmRemove).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining(filledProduct.name) }),
    );
    expect(remove).toHaveBeenCalled();
  });
});

describe('Удаление модели через окно подтверждения', () => {
  it('🔴 спрашивает окном панели, а не системным confirm', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }));

    render(<ProductForm values={filledProduct} save={vi.fn()} remove={remove} />);
    await user.click(screen.getByRole('button', { name: texts.remove }));

    const request = texts.removeConfirm(filledProduct.name);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(request.title);
    expect(remove).not.toHaveBeenCalled();

    // ищем внутри окна: кнопка формы называется тем же словом
    await user.click(within(dialog).getByRole('button', { name: request.confirmLabel }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
  });
});

describe('Характеристики модели', () => {
  it('🔴 набор произвольный: добавляется любая пара (инвариант 6)', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true, id: 'x' }) as const);
    render(<ProductForm values={filledProduct} save={save} />);

    await user.click(screen.getByRole('button', { name: texts.specAdd }));
    await user.type(screen.getByLabelText(`${texts.specName} 3`), 'Wi-Fi управление');
    await user.type(screen.getByLabelText(`${texts.specValue} 3`), 'есть');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        specs: [...filledProduct.specs, { k: 'Wi-Fi управление', v: 'есть' }],
      }),
    );
  });

  it('удаление пары не задевает соседние', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true, id: 'x' }) as const);
    render(<ProductForm values={filledProduct} save={save} />);

    await user.click(screen.getByRole('button', { name: texts.specRemove(1) }));
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ specs: [{ k: 'Уровень шума', v: '21 дБ' }] }),
    );
  });

  it('модель без характеристик предупреждает о таблице сравнения', () => {
    render(<ProductForm values={{ ...filledProduct, specs: [] }} save={vi.fn()} />);

    expect(screen.getByText(texts.specsEmpty)).toBeInTheDocument();
  });
});
