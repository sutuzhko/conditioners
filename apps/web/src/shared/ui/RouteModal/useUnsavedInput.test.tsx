import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useUnsavedInput } from './useUnsavedInput';

/**
 * Форма-образец: поле, кнопка правки, кнопка отправки и пункт списка —
 * ровно те четыре случая, которыми правки приходят в панель.
 */
function Sample() {
  const unsaved = useUnsavedInput();

  return (
    <div>
      <p>Правки: {unsaved.dirty ? 'есть' : 'нет'}</p>
      <div {...unsaved.scope}>
        <input aria-label="Название" />
        <button type="button" onClick={() => undefined}>
          Добавить строку
        </button>
        <button type="submit">Сохранить</button>
        <ul role="listbox" aria-label="Клиент">
          {/* Образец повторяет разметку `Autocomplete`: выбор идёт нажатием,
              клавиатура живёт в поле ввода, а не в пунктах. */}
          <li role="option" aria-selected={false}>
            Иванов
          </li>
        </ul>
      </div>
      <button type="button" onClick={unsaved.markSaved}>
        Сохранили
      </button>
    </div>
  );
}

const state = (): string | null => screen.getByText(/^Правки:/).textContent;

describe('useUnsavedInput', () => {
  it('до первого действия форма считается нетронутой', () => {
    render(<Sample />);

    expect(state()).toBe('Правки: нет');
  });

  it('ввод в поле помечает форму изменённой', async () => {
    render(<Sample />);
    await userEvent.type(screen.getByLabelText('Название'), 'С');

    expect(state()).toBe('Правки: есть');
  });

  it('🔴 правка кнопкой тоже считается правкой (issue #34)', async () => {
    render(<Sample />);
    await userEvent.click(screen.getByRole('button', { name: 'Добавить строку' }));

    expect(state()).toBe('Правки: есть');
  });

  it('🔴 отправка правкой не считается: пустой форме, отбитой проверкой, терять нечего', async () => {
    render(<Sample />);
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(state()).toBe('Правки: нет');
  });

  it('🔴 выбор пункта списка помечает правку: до `click` пункта уже нет в разметке', async () => {
    render(<Sample />);
    await userEvent.click(screen.getByRole('option', { name: 'Иванов' }));

    expect(state()).toBe('Правки: есть');
  });

  it('щелчок мимо органов управления ничего не помечает', async () => {
    render(<Sample />);
    await userEvent.click(screen.getByRole('listbox', { name: 'Клиент' }));

    expect(state()).toBe('Правки: нет');
  });

  it('сохранение снимает признак', async () => {
    render(<Sample />);
    await userEvent.click(screen.getByRole('button', { name: 'Добавить строку' }));
    await userEvent.click(screen.getByRole('button', { name: 'Сохранили' }));

    expect(state()).toBe('Правки: нет');
  });
});
