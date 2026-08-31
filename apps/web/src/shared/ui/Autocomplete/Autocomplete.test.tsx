import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Autocomplete } from './Autocomplete';
import type { AutocompleteOption } from './Autocomplete';

const CLIENTS: readonly AutocompleteOption[] = [
  { value: 'c1', label: 'Иванов Иван', note: '+7 900 000-00-01' },
  { value: 'c2', label: 'Иванченко Пётр', note: '+7 900 000-00-02' },
  { value: 'c3', label: 'Ивашов Сергей' },
];

function setup(options: readonly AutocompleteOption[] = CLIENTS) {
  const onSelect = vi.fn();
  const onQueryChange = vi.fn();

  render(
    <Autocomplete
      label="Клиент"
      options={options}
      query="Ива"
      onQueryChange={onQueryChange}
      onSelect={onSelect}
    />,
  );

  return { onSelect, onQueryChange, field: screen.getByRole('combobox', { name: /Клиент/ }) };
}

describe('Автодополнение', () => {
  it('поле объявлено combobox и закрыто, пока в него не вошли', () => {
    const { field } = setup();

    expect(field).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('фокус открывает список подсказок', async () => {
    const user = userEvent.setup();
    const { field } = setup();

    await user.click(field);

    expect(field).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  /* 🔴 Фокус остаётся в поле, а стрелки ходят по списку через
     `aria-activedescendant`. Перенос фокуса в список ломает набор и
     озвучивается как уход со страницы. */
  it('стрелки ведут по списку, не забирая фокус из поля', async () => {
    const user = userEvent.setup();
    const { field } = setup();

    await user.click(field);
    await user.keyboard('{ArrowDown}');

    expect(field).toHaveFocus();
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('список переносится по кругу — вверх с первого пункта ведёт на последний', async () => {
    const user = userEvent.setup();
    const { field } = setup();

    await user.click(field);
    await user.keyboard('{ArrowUp}');

    expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('Enter выбирает подсвеченный пункт', async () => {
    const user = userEvent.setup();
    const { field, onSelect } = setup();

    await user.click(field);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(CLIENTS[1]);
  });

  /* 🔴 Esc закрывает список и оставляет набранное: человек набирал фамилию
     клиента, а не открывал список. Стирающий Esc — обиднейшая потеря работы. */
  it('Esc закрывает список, не трогая набранное', async () => {
    const user = userEvent.setup();
    const { field, onQueryChange } = setup();

    await user.click(field);
    await user.keyboard('{Escape}');

    expect(field).toHaveAttribute('aria-expanded', 'false');
    expect(field).toHaveValue('Ива');
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it('нажатие на пункт выбирает его', async () => {
    const user = userEvent.setup();
    const { field, onSelect } = setup();

    await user.click(field);
    await user.click(screen.getByRole('option', { name: /Ивашов Сергей/ }));

    expect(onSelect).toHaveBeenCalledWith(CLIENTS[2]);
  });

  /* Пустой список молча читается как поломка: человек начинает стирать буквы,
     проверяя, работает ли поиск. */
  it('пустой ответ объясняется словами', async () => {
    const user = userEvent.setup();
    setup([]);

    await user.click(screen.getByRole('combobox', { name: /Клиент/ }));

    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });

  it('в поле не используется tabindex больше нуля', () => {
    const { field } = setup();

    expect(field).not.toHaveAttribute('tabindex');
  });
});
