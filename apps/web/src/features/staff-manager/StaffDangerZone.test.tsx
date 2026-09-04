import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

import { StaffDangerZone } from './StaffDangerZone';
import { staffManagerContent as texts } from './content';
import { acceptingApi, activeInstaller } from './fixtures';
import { staffTitle } from './model';

describe('Опасная зона карточки монтажника', () => {
  it('🔴 спрашивает окном панели, а не системным confirm', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);

    render(
      <StaffDangerZone staff={activeInstaller} orders={0} api={{ ...acceptingApi, remove }} />,
    );
    await user.click(screen.getByRole('button', { name: texts.remove }));

    /* Окно есть в разметке — без него обещание не разрешится и удаление молча
       не случится. Учётная запись из необратимых действий самое дорогое:
       системное окно выглядело для неё так же, как для «удалить фотографию». */
    const request = texts.removeConfirm(staffTitle(activeInstaller));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(request.title);
    expect(dialog).toHaveAccessibleDescription(request.description ?? '');
    expect(remove).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: request.confirmLabel }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(activeInstaller.id));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/team'));
  });

  it('отказ от подтверждения ничего не удаляет', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);

    render(
      <StaffDangerZone
        staff={activeInstaller}
        orders={0}
        api={{ ...acceptingApi, remove }}
        confirmRemove={async () => false}
      />,
    );
    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(remove).not.toHaveBeenCalled();
  });

  /* 🔴 Отключённая кнопка без объяснения хуже отсутствующей: человек нажимает,
     ничего не происходит, и он не знает, сломался интерфейс или так задумано
     (issue #351). */
  it('🔴 с закреплёнными нарядами удаление отключено, и причина написана рядом', () => {
    render(<StaffDangerZone staff={activeInstaller} orders={3} api={acceptingApi} />);

    expect(screen.getByRole('button', { name: texts.remove })).toBeDisabled();
    expect(screen.getByText(texts.removeBlocked(3))).toBeInTheDocument();
  });

  it('без нарядов удаление доступно, а объяснение говорит о последствиях', () => {
    render(<StaffDangerZone staff={activeInstaller} orders={0} api={acceptingApi} />);

    expect(screen.getByRole('button', { name: texts.remove })).toBeEnabled();
    expect(screen.getByText(texts.removeHint)).toBeInTheDocument();
  });

  it('закрывает и открывает доступ, не трогая учётную запись', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(
      <StaffDangerZone staff={activeInstaller} orders={2} api={{ ...acceptingApi, update }} />,
    );
    await user.click(screen.getByRole('button', { name: texts.disable }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(activeInstaller.id, { active: false }));
  });

  /* 🔴 Слова «штраф» нет ни в одном пользовательском тексте раздела: штрафов
     как вида взыскания в ТК РФ не существует (CRM.md §9, ADR-114). */
  it('🔴 не произносит слово «штраф»', () => {
    const { container } = render(
      <StaffDangerZone staff={activeInstaller} orders={0} api={acceptingApi} />,
    );

    expect(container.textContent).not.toMatch(/штраф/i);
  });
});
