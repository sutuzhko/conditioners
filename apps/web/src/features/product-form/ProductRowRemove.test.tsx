import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { productFormContent as texts } from './content';
import { ProductRowRemove } from './ProductRowRemove';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => refresh(), push: vi.fn() }),
}));

const NAME = 'Сплит-система 09, инверторная';

const button = () => screen.getByRole('button', { name: texts.removeLabel(NAME) });

describe('Удаление модели из строки списка', () => {
  it('подпись называет саму строку, а не просто «Удалить»', () => {
    render(<ProductRowRemove id="1" name={NAME} confirmRemove={async () => false} />);

    expect(button()).toBeInTheDocument();
  });

  /* 🔴 Главная проверка задачи (issue #577): отказ от подтверждения не должен
     менять ничего. Молчаливое удаление «на всякий случай» — это потерянная
     модель вместе с фотографиями. */
  it('отказ от подтверждения ничего не удаляет', async () => {
    const remove = vi.fn(async () => ({ ok: true }));
    render(
      <ProductRowRemove id="1" name={NAME} remove={remove} confirmRemove={async () => false} />,
    );

    await userEvent.click(button());

    expect(remove).not.toHaveBeenCalled();
  });

  it('согласие удаляет и перечитывает серверный список', async () => {
    refresh.mockClear();
    const remove = vi.fn(async () => ({ ok: true }));
    render(
      <ProductRowRemove id="1" name={NAME} remove={remove} confirmRemove={async () => true} />,
    );

    await userEvent.click(button());

    expect(remove).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalled();
  });

  /* Отказ сервера остаётся на экране словами: молчание после нажатия читается
     как «удалилось», а строка при этом на месте. */
  it('отказ сервера показывается словами', async () => {
    const remove = vi.fn(async () => ({ ok: false, message: 'Модель стоит в наряде' }));
    render(
      <ProductRowRemove id="1" name={NAME} remove={remove} confirmRemove={async () => true} />,
    );

    await userEvent.click(button());

    expect(await screen.findByRole('alert')).toHaveTextContent('Модель стоит в наряде');
  });
});
