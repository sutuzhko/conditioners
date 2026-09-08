import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { productFormContent as texts } from './content';
import type { SetProductFlag } from './model';
import { ProductFlagSwitch } from './ProductFlagSwitch';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => refresh() }) }));

const NAME = 'Сплит-система 09';

/* 🔴 Тип объявлен у подмены, а не выведен из `vi.fn()`: голая подмена
   типизирует аргументы как `any` и молча обходит запрет проекта на `as`. */
const accepting = (): SetProductFlag => vi.fn<SetProductFlag>(async () => ({ ok: true }));
const refusing = (): SetProductFlag =>
  vi.fn<SetProductFlag>(async () => ({ ok: false, message: texts.serverError }));

describe('Признак модели из списка каталога', () => {
  it('снимает модель с продажи одним нажатием', async () => {
    const user = userEvent.setup();
    const save = accepting();

    render(<ProductFlagSwitch id="1" name={NAME} flag="visible" on save={save} />);

    await user.click(screen.getByRole('switch', { name: texts.visibleLabel(NAME) }));

    expect(save).toHaveBeenCalledWith('1', 'visible', false);
    expect(screen.getByRole('switch', { name: texts.visibleLabel(NAME) })).not.toBeChecked();
  });

  /** Витрина главной переключается тем же элементом и той же ручкой (issue #751). */
  it('ставит модель на главную тем же переключателем', async () => {
    const user = userEvent.setup();
    const save = accepting();

    render(<ProductFlagSwitch id="1" name={NAME} flag="featured" on={false} save={save} />);

    await user.click(screen.getByRole('switch', { name: texts.featuredLabel(NAME) }));

    expect(save).toHaveBeenCalledWith('1', 'featured', true);
    expect(screen.getByRole('switch', { name: texts.featuredLabel(NAME) })).toBeChecked();
  });

  /**
   * 🔴 Отказ обязан вернуть переключатель назад: оставленное новое положение
   * врало бы о том, что показывает сайт.
   */
  it('при отказе сервера возвращает прежнее положение и объясняет отказ', async () => {
    const user = userEvent.setup();

    render(<ProductFlagSwitch id="1" name={NAME} flag="visible" on save={refusing()} />);

    await user.click(screen.getByRole('switch', { name: texts.visibleLabel(NAME) }));

    expect(screen.getByRole('switch', { name: texts.visibleLabel(NAME) })).toBeChecked();
    expect(screen.getByRole('alert')).toHaveTextContent(texts.serverError);
  });
});
