import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SummaryTable } from './SummaryTable';
import { adminSummaryContent as texts } from './summary-content';
import { DEFAULT_UPCOMING_FILTERS } from './summary-list';

/**
 * Пустые «Ближайшие дела» — issue #580.
 *
 * 🔴 Проверяется не текст, а выход: до правки состояние «ничего не нашлось»
 * словами просило «снять условие над таблицей», а снимать его надо было
 * вручную — пилюлями, которые в этот момент прокручены выше экрана. Пустой
 * план и пустой отбор при этом обязаны остаться разными экранами: шаги у них
 * противоположные.
 */
describe('пустая таблица ближайших дел', () => {
  it('🔴 пустой отбор даёт ссылку, которая возвращает список без условий', () => {
    render(
      <SummaryTable
        items={[]}
        filters={{ ...DEFAULT_UPCOMING_FILTERS, show: 'overdue', query: 'нет такого' }}
        page={1}
        pages={1}
      />,
    );

    expect(screen.getByRole('heading', { name: texts.upcomingNotFoundTitle })).toBeVisible();

    const reset = screen.getByRole('link', { name: texts.upcomingNotFoundAction });
    expect(reset).toBeVisible();

    /* Адрес сброса ведёт на сводку и не несёт ни отбора, ни запроса. */
    const href = reset.getAttribute('href') ?? '';
    expect(href).toContain('/admin');
    expect(href).not.toContain('overdue');
    expect(href).not.toContain('%D0%BD%D0%B5%D1%82');
  });

  it('🔴 пустой план выхода не даёт: сбрасывать нечего, работа заводится в другом разделе', () => {
    render(<SummaryTable items={[]} filters={DEFAULT_UPCOMING_FILTERS} page={1} pages={1} />);

    expect(screen.getByRole('heading', { name: texts.upcomingEmptyTitle })).toBeVisible();
    expect(screen.queryByRole('link', { name: texts.upcomingNotFoundAction })).toBeNull();
  });
});
