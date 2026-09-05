import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { InstallerNotes } from './InstallerNotes';
import { staffManagerContent as texts } from './content';
import { acceptingApi, notes } from './fixtures';

/**
 * 🔴 Заметка владельца — необратимое удаление без подтверждения (issue #603).
 * Крестик стирал её сразу: восстановить нечем, а стоит она того наблюдения о
 * человеке, ради которого её и записали. Подтверждение — окном кита, а не
 * окном браузера (ADR-113).
 */
describe('Заметки владельца о монтажнике', () => {
  it('🔴 удаление спрашивает подтверждение и называет саму заметку', async () => {
    const removeNote = vi.fn(async () => ({ ok: true }) as const);
    const confirmRemove = vi.fn(async () => true);

    render(
      <InstallerNotes
        staffId="u2"
        notes={notes}
        api={{ ...acceptingApi, removeNote }}
        confirmRemove={confirmRemove}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: texts.noteRemove }));

    expect(confirmRemove).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining(notes[0]?.text.slice(0, 40) ?? ''),
      }),
    );
    expect(removeNote).toHaveBeenCalledWith('u2', notes[0]?.id);
  });

  it('🔴 отказ от подтверждения заметку не удаляет', async () => {
    const removeNote = vi.fn(async () => ({ ok: true }) as const);

    render(
      <InstallerNotes
        staffId="u2"
        notes={notes}
        api={{ ...acceptingApi, removeNote }}
        confirmRemove={async () => false}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: texts.noteRemove }));

    expect(removeNote).not.toHaveBeenCalled();
  });

  /* 🔴 Заметка о человеке — наблюдение в две-три строки: в строке ввода её
     начало уезжает за левый край, пока дописывают конец (макет `CardTabs.png`). */
  it('🔴 поле заметки многострочное', () => {
    render(<InstallerNotes staffId="u2" notes={notes} api={acceptingApi} />);

    expect(screen.getByLabelText(texts.notesTitle).tagName).toBe('TEXTAREA');
  });

  it('пустая заметка не отправляется', async () => {
    const addNote = vi.fn(async () => ({ ok: true }) as const);

    render(<InstallerNotes staffId="u2" notes={notes} api={{ ...acceptingApi, addNote }} />);

    expect(screen.getByRole('button', { name: texts.noteAdd })).toBeDisabled();
    expect(addNote).not.toHaveBeenCalled();
  });
});
