import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EMPTY_ACTIVITY_FILTER } from '@/entities/activity/model';

import { ActivityFilters } from './ActivityFilters';
import { activityLogContent as texts } from './content';
import { activityFilterApplied, activityPeople } from './fixtures';

/** Форма отбора: она же и есть весь механизм — условия уезжают в адрес сами. */
function form(): HTMLFormElement {
  const found = document.querySelector('form');
  if (found === null) throw new Error('отбор не отрисовал форму');

  return found;
}

describe('отбор журнала', () => {
  /**
   * 🔴 Обычная форма `GET`, а не состояние компонента (ADR-105). Отсюда всё
   * остальное: страницу отбора можно прислать ссылкой, «назад» возвращает к
   * прошлому отбору, и раздел не платит за отбор ни байтом бюджета.
   */
  it('уводит условия в адрес обычной формой, а не скриптом', () => {
    render(<ActivityFilters filter={EMPTY_ACTIVITY_FILTER} people={activityPeople} />);

    expect(form().getAttribute('method')).toBe('get');
    expect(form().getAttribute('action')).toBe('/admin/activity');
  });

  it('спрашивает про человека, роль, раздел, сущность и период', () => {
    render(<ActivityFilters filter={EMPTY_ACTIVITY_FILTER} people={activityPeople} />);

    const names = [...form().querySelectorAll('select, input')].map((field) =>
      field.getAttribute('name'),
    );

    expect(names).toEqual(['actor', 'role', 'section', 'entity', 'from', 'to']);
  });

  /**
   * 🔴 Номер страницы в форму не попадает намеренно: отбор всегда открывается
   * с первой страницы. Остаться на седьмой после смены условий значит увидеть
   * пустой список там, где записи есть.
   */
  it('номер страницы с отбором не едет', () => {
    render(<ActivityFilters filter={activityFilterApplied} people={activityPeople} />);

    expect(form().querySelector('[name="page"]')).toBeNull();
  });

  it('поля открываются заполненными: отбор читается из адреса', () => {
    render(<ActivityFilters filter={activityFilterApplied} people={activityPeople} />);

    expect(screen.getByLabelText(texts.filterActor)).toHaveValue('u2');
    expect(screen.getByLabelText(texts.filterRole)).toHaveValue('manager');
    expect(screen.getByLabelText(texts.filterFrom)).toHaveValue('2026-09-01');
  });

  /* Сброс — ссылка, а не кнопка: условия живут в адресе, и снять их значит
     уйти на тот же раздел без хвоста. */
  it('сброс появляется только при набранном отборе и ведёт в раздел без хвоста', () => {
    const { rerender } = render(
      <ActivityFilters filter={EMPTY_ACTIVITY_FILTER} people={activityPeople} />,
    );
    expect(screen.queryByText(texts.filterReset)).not.toBeInTheDocument();

    rerender(<ActivityFilters filter={activityFilterApplied} people={activityPeople} />);
    expect(screen.getByText(texts.filterReset)).toHaveAttribute('href', '/admin/activity');
  });

  /* 🔴 Уволенные из списка не вычёркиваются: их события в журнале остались, и
     «что делал уволившийся в июле» — обычный вопрос к журналу. */
  it('в «Кто» стоят все учётные записи и вариант «любой»', () => {
    render(<ActivityFilters filter={EMPTY_ACTIVITY_FILTER} people={activityPeople} />);

    const options = [...screen.getByLabelText(texts.filterActor).querySelectorAll('option')].map(
      (option) => option.textContent,
    );

    expect(options).toEqual([texts.filterActorAll, 'Богдан', 'Ирина', 'Лебедева']);
  });
});
