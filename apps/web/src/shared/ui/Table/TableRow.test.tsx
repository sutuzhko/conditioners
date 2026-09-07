import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Table } from './Table';
import { TableRow, TableRowLink, tableAboveClassName } from './TableRow';

/** Строка-цель так, как её собирает раздел: ссылка, текст и своё действие. */
function Queue() {
  return (
    <Table variant="cards" label="Очередь">
      <thead>
        <tr>
          <th scope="col">Кто</th>
          <th scope="col">Тема</th>
          <th scope="col">
            <span className="srOnly">Действия</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <TableRow current>
          <td role="cell" data-label="Кто">
            <TableRowLink href="/" label="Обращение № 12, Жуков Кирилл" aria-current="page">
              Жуков Кирилл
            </TableRowLink>
            <span className={tableAboveClassName()}>Тула, Оборонная 12</span>
          </td>
          <td role="cell" data-label="Тема">
            Установка
          </td>
          <td role="cell">
            <div className={tableAboveClassName()}>
              <button type="button">Действия над обращением № 12</button>
            </div>
          </td>
        </TableRow>
      </tbody>
    </Table>
  );
}

describe('Строка списка как цель целиком', () => {
  /**
   * 🔴 Целей у строки не прибавляется. Ссылка на каждой ячейке превратила бы
   * список из восьми строк в сорок восемь одинаковых остановок для
   * клавиатуры, а список ссылок в озвучке — в перечень из сорока восьми имён.
   */
  it('🔴 на строку приходится одна ссылка, и подпись называет запись', () => {
    render(<Queue />);

    const row = screen.getAllByRole('row')[1];
    expect(row).toBeDefined();
    if (row === undefined) return;

    expect(within(row).getAllByRole('link')).toHaveLength(1);
    expect(
      within(row).getByRole('link', { name: 'Обращение № 12, Жуков Кирилл' }),
    ).toBeInTheDocument();
  });

  /**
   * 🔴 Видимый текст входит в подпись (WCAG 2.5.3): голосовой доступ ищет
   * строку по тому, что видно, а не по тому, что читает озвучка.
   */
  it('видимый текст остаётся частью подписи ссылки', () => {
    render(<Queue />);

    const link = screen.getByRole('link', { name: 'Обращение № 12, Жуков Кирилл' });
    expect(link).toHaveTextContent('Жуков Кирилл');
  });

  /**
   * 🔴 Действие строки остаётся своей целью, а не частью ссылки. Кнопка
   * внутри ссылки — интерактив в интерактиве, и такой разметки быть не
   * должно вовсе.
   */
  it('🔴 действие строки — отдельная цель, а не часть ссылки', async () => {
    const user = userEvent.setup();
    render(<Queue />);

    const action = screen.getByRole('button', { name: 'Действия над обращением № 12' });
    expect(action.closest('a')).toBeNull();

    /* Следующая остановка после строки — её действие: между ними в строке
       нет ничего достижимого. Фокус ставится на ссылку, а не добирается
       табуляцией от начала документа: перед таблицей стоит её собственный
       контейнер прокрутки, и он к строке отношения не имеет. */
    const link = screen.getByRole('link', { name: 'Обращение № 12, Жуков Кирилл' });
    link.focus();
    expect(link).toHaveFocus();

    await user.tab();
    expect(action).toHaveFocus();
  });

  /** Открытая строка помечается признаком: по нему кит не подсвечивает её. */
  it('открытая строка помечена признаком, а не только краской раздела', () => {
    render(<Queue />);

    const row = screen.getAllByRole('row')[1];
    expect(row).toBeDefined();
    if (row === undefined) return;

    expect(row).toHaveAttribute('data-current');
  });

  /**
   * 🔴 Сам приём — перекрытие и поднятое над ним — живёт в раскладке, а
   * раскладки в jsdom нет. Поэтому сторожится текст правил: без перекрытия
   * строка перестаёт нажиматься целиком, без поднятия «Позвонить» открывает
   * карточку вместо звонка, а протяжка по адресу даёт пустую строку вместо
   * выделенного текста и засчитывается как нажатие по ссылке.
   */
  it('🔴 перекрытие строки на месте, и над ним есть чему подняться', () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'TableRow.module.css'),
      'utf8',
    );

    expect(css).toMatch(/\.row\s*\{[^}]*position:\s*relative/);
    expect(css).toMatch(/\.link::after\s*\{[^}]*inset:\s*0/);
    expect(css).toMatch(/\.above\s*\{[^}]*z-index:\s*1/);

    /* Отклик до нажатия и кольцо фокуса: цель размером в полстроки без них
       неотличима от подписи, а фокус на ней невидим. */
    expect(css).toMatch(/\.row:not\(\[data-current\]\):has\(\.link:hover\)/);
    expect(css).toMatch(/\.link:focus-visible::after\s*\{[^}]*--ring-focus-inset/);
  });
});
