import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { defaultSymptoms, diagnosticsText } from './content';
import { DiagnosticsPicker } from './DiagnosticsPicker';

/** Сетка симптомов — она же группа чипов. */
function grid(): HTMLElement {
  return screen.getByRole('group', { name: diagnosticsText.chipsLabel });
}

/**
 * Симптомы стоят сеткой (issue #272): все шесть видны сразу, прокрутки нет.
 * Порядок обхода с клавиатуры — порядок списка, и сама сетка остановкой Tab
 * не является: внутри неё только кнопки.
 */
describe('Сетка симптомов — клавиатура', () => {
  it('сетка — группа с доступным именем', () => {
    render(<DiagnosticsPicker symptoms={defaultSymptoms} />);

    expect(grid()).toHaveAccessibleName(diagnosticsText.chipsLabel);
  });

  it('каждый симптом достижим одним Tab в порядке списка', async () => {
    const user = userEvent.setup();
    render(<DiagnosticsPicker symptoms={defaultSymptoms} />);

    for (const symptom of defaultSymptoms) {
      await user.tab();

      expect(screen.getByRole('button', { name: symptom.label })).toHaveFocus();
      expect(grid().contains(document.activeElement)).toBe(true);
    }
  });

  it('🔴 сама сетка фокус не берёт: внутри только кнопки, лишняя остановка не нужна', async () => {
    const user = userEvent.setup();
    render(<DiagnosticsPicker symptoms={defaultSymptoms} />);

    const chips = grid();
    expect(chips).not.toHaveAttribute('tabindex');
    // условие, при котором контейнеру не нужен свой tabIndex: фокусируем каждый
    // ребёнок, и недостижимого с клавиатуры содержимого в ленте не остаётся
    expect(Array.from(chips.children).every((node) => node.tagName === 'BUTTON')).toBe(true);

    await user.tab();

    expect(chips).not.toHaveFocus();
    expect(document.activeElement).toBe(chips.firstElementChild);
  });
});
