import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientCreateModal } from './ClientCreateModal';
import { clientManagerContent as texts } from './content';
import { acceptingApi } from './fixtures';

const back = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back, replace, refresh, push }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  /* Длина истории больше единицы: окно открыли из списка, и закрытие обязано
     быть шагом назад, а не заменой адреса. */
  vi.spyOn(globalThis.history, 'length', 'get').mockReturnValue(3);
});

describe('Окно заведения клиента', () => {
  it('окно с формой, заголовок и пояснение — из подписей раздела', () => {
    render(<ClientCreateModal api={acceptingApi} />);

    expect(screen.getByRole('dialog', { name: texts.addTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(texts.name)).toBeInTheDocument();
  });

  it('🔴 заполненная форма по Escape спрашивает, а не закрывается молча', async () => {
    const user = userEvent.setup();
    render(<ClientCreateModal api={acceptingApi} />);

    await user.type(screen.getByLabelText(texts.name), 'Ирина');
    await user.keyboard('{Escape}');

    /* Человек, потерявший заполненную форму случайным нажатием, второй раз её
       не заполнит — он позвонит (ADR-141). */
    expect(back).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('пустая форма закрывается сразу — терять нечего', async () => {
    const user = userEvent.setup();
    render(<ClientCreateModal api={acceptingApi} />);

    await user.keyboard('{Escape}');

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('сохранили — окно уходит само, список под ним обновляется', async () => {
    const user = userEvent.setup();
    render(<ClientCreateModal api={acceptingApi} />);

    await user.type(screen.getByLabelText(texts.name), 'Ирина Соколова');
    await user.click(screen.getByRole('button', { name: texts.add }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);
  });
});
