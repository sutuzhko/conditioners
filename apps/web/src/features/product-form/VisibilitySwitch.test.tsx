import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { productFormContent as texts } from './content';
import { VisibilitySwitch } from './VisibilitySwitch';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => refresh() }) }));

const NAME = 'Сплит-система 09';

describe('Видимость модели из списка каталога', () => {
  it('снимает модель с продажи одним нажатием', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }));

    render(<VisibilitySwitch id="1" name={NAME} visible save={save} />);

    await user.click(screen.getByRole('switch', { name: texts.visibleLabel(NAME) }));

    expect(save).toHaveBeenCalledWith('1', false);
    expect(screen.getByRole('switch', { name: texts.visibleLabel(NAME) })).not.toBeChecked();
  });

  /**
   * 🔴 Отказ обязан вернуть переключатель назад: оставленное новое положение
   * врало бы о том, что показывает сайт.
   */
  it('при отказе сервера возвращает прежнее положение и объясняет отказ', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: false, message: texts.serverError }));

    render(<VisibilitySwitch id="1" name={NAME} visible save={save} />);

    await user.click(screen.getByRole('switch', { name: texts.visibleLabel(NAME) }));

    expect(screen.getByRole('switch', { name: texts.visibleLabel(NAME) })).toBeChecked();
    expect(screen.getByRole('alert')).toHaveTextContent(texts.serverError);
  });
});
