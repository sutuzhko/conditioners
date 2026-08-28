import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StaffCreateModal } from './StaffCreateModal';
import { staffManagerContent as texts } from './content';
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

describe('Окно заведения монтажника', () => {
  it('окно с формой, заголовок и пояснение — из подписей раздела', () => {
    render(<StaffCreateModal api={acceptingApi} />);

    expect(screen.getByRole('dialog', { name: texts.addTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(texts.login)).toBeInTheDocument();
  });

  it('🔴 ИНН в окне работает так же, как на странице: самозанятый без него предупреждает', async () => {
    const user = userEvent.setup();
    render(<StaffCreateModal api={acceptingApi} />);

    expect(screen.queryByText(texts.innMissing)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(texts.employment), 'self_employed');

    /* Предупреждение, а не запрет: слетевший статус означает НДФЛ и взносы за
       компанию, и молчать об этом нельзя (ADR-144). */
    expect(screen.getByText(texts.innMissing)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.add })).toBeEnabled();

    await user.type(screen.getByLabelText(texts.inn), '710703123450');
    expect(screen.queryByText(texts.innMissing)).not.toBeInTheDocument();
  });

  it('🔴 заполненная форма по Escape спрашивает, а не закрывается молча', async () => {
    const user = userEvent.setup();
    render(<StaffCreateModal api={acceptingApi} />);

    await user.type(screen.getByLabelText(texts.login), 'sokolov');
    await user.keyboard('{Escape}');

    /* Человек, потерявший заполненную форму случайным нажатием, второй раз её
       не заполнит (ADR-141). */
    expect(back).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('пустая форма закрывается сразу — терять нечего', async () => {
    const user = userEvent.setup();
    render(<StaffCreateModal api={acceptingApi} />);

    await user.keyboard('{Escape}');

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('завели — окно уходит само, список под ним обновляется', async () => {
    const user = userEvent.setup();
    render(<StaffCreateModal api={acceptingApi} />);

    await user.type(screen.getByLabelText(texts.login), 'sokolov');
    await user.click(screen.getByRole('button', { name: texts.add }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);
  });
});
