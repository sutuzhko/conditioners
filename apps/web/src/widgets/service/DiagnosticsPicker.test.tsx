import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { defaultSymptoms, diagnosticsText } from './content';
import { DiagnosticsPicker } from './DiagnosticsPicker';

/** Прокручиваемая лента симптомов — она же группа чипов. */
function strip(): HTMLElement {
  return screen.getByRole('group', { name: diagnosticsText.chipsLabel });
}

/**
 * Лента симптомов прокручивается по горизонтали (`.chips`, overflow-x: auto), а
 * прокручиваемая область обязана быть достижима с клавиатуры. Достигается она
 * через собственные кнопки, а не отдельной остановкой Tab на контейнере, —
 * тесты держат оба конца решения: имя у области есть, лишней остановки нет.
 */
describe('Лента симптомов — клавиатура и прокрутка', () => {
  it('область прокрутки — группа с доступным именем', () => {
    render(<DiagnosticsPicker symptoms={defaultSymptoms} />);

    expect(strip()).toHaveAccessibleName(diagnosticsText.chipsLabel);
  });

  it('каждый симптом ленты достижим одним Tab — прокрутка едет за фокусом', async () => {
    const user = userEvent.setup();
    render(<DiagnosticsPicker symptoms={defaultSymptoms} />);

    for (const symptom of defaultSymptoms) {
      await user.tab();

      expect(screen.getByRole('button', { name: symptom.label })).toHaveFocus();
      expect(strip().contains(document.activeElement)).toBe(true);
    }
  });

  it('🔴 сама лента фокус не берёт: внутри только кнопки, лишняя остановка не нужна', async () => {
    const user = userEvent.setup();
    render(<DiagnosticsPicker symptoms={defaultSymptoms} />);

    const chips = strip();
    expect(chips).not.toHaveAttribute('tabindex');
    // условие, при котором контейнеру не нужен свой tabIndex: фокусируем каждый
    // ребёнок, и недостижимого с клавиатуры содержимого в ленте не остаётся
    expect(Array.from(chips.children).every((node) => node.tagName === 'BUTTON')).toBe(true);

    await user.tab();

    expect(chips).not.toHaveFocus();
    expect(document.activeElement).toBe(chips.firstElementChild);
  });
});
