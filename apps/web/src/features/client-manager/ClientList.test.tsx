import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { tableAboveClassName } from '@/shared/ui';

import { ClientList } from './ClientList';
import { clientManagerContent as texts } from './content';
import { emptyPage, longPage, page } from './fixtures';

describe('Список клиентов', () => {
  it('показывает строки страницы', () => {
    render(<ClientList page={page} />);

    /* 🔴 Подпись ссылки называет запись целиком, а не одно имя (issue #743):
       нажимается вся строка, и список ссылок, прочитанный подряд, обязан
       быть перечнем записей, а не перечнем людей (ADR-347). */
    expect(screen.getByRole('link', { name: texts.rowLabel('Ирина Соколова') })).toHaveAttribute(
      'href',
      '/admin/clients/c1',
    );
    expect(screen.getByRole('link', { name: texts.rowLabel('Пётр Ильин') })).toBeInTheDocument();
  });

  /**
   * 🔴 Раздел решает ровно одно: что поднято над перекрытием строки. Сам приём
   * живёт в ките (`TableRow`), и его сторожит китовый тест; здесь проверяется
   * выбор клиентов — телефон и меню строки. Без этого «позвонить» открывало бы
   * карточку, а меню было бы недостижимо вовсе (issue #743).
   */
  it('🔴 над перекрытием строки подняты телефон и меню действий', () => {
    render(<ClientList page={page} />);

    const row = screen.getAllByRole('row')[1];
    expect(row).toBeDefined();
    if (row === undefined) return;

    const phone = within(row)
      .getAllByRole('link')
      .find((link) => link.getAttribute('href')?.startsWith('tel:') === true);

    expect(phone).toHaveClass(tableAboveClassName());

    /* `closest`, а не `parentElement`: меню кита само оборачивает свою кнопку,
       и число обёрток между ними — его дело, а не раздела. */
    const menu = within(row).getByRole('button', { name: texts.rowActions('Ирина Соколова') });
    expect(menu.closest(`.${tableAboveClassName()}`)).not.toBeNull();
  });

  /* 🔴 Три колонки, ради которых список перестал быть карточками (issue #602):
     по ним видно, кто ездит каждый год, а кто отвалился. */
  it('🔴 показывает число заказов, сумму и дату последнего', () => {
    render(<ClientList page={page} />);

    expect(screen.getByRole('cell', { name: texts.money(98_700) })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: texts.date('2026-08-29T06:00:00.000Z') }),
    ).toBeInTheDocument();
  });

  /* Работ не было — «0 ₽» читалось бы как выручка, которой не случилось. */
  it('отсутствие работ названо словами, а не нулём', () => {
    render(<ClientList page={page} />);

    expect(screen.getByText(texts.noOrders)).toBeInTheDocument();
  });

  it('на одной странице разбивки нет', () => {
    render(<ClientList page={page} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  /* 🔴 Действия строки достижимы из списка, а не только из карточки
     (ADR-307 §4): удаление — исполнение требования 152-ФЗ. */
  it('🔴 у каждой строки есть меню действий со своим именем', () => {
    render(<ClientList page={page} />);

    expect(
      screen.getByRole('button', { name: texts.rowActions('Ирина Соколова') }),
    ).toBeInTheDocument();
  });

  it('🔴 поиск переезжает на соседние страницы вместе с переходом', () => {
    render(<ClientList page={longPage} query="Соколова" />);

    expect(screen.getByRole('link', { name: /Дальше/ })).toHaveAttribute(
      'href',
      '/admin/clients?q=%D0%A1%D0%BE%D0%BA%D0%BE%D0%BB%D0%BE%D0%B2%D0%B0&page=3',
    );
  });

  it('пустая база объясняет, с чего начать', () => {
    render(<ClientList page={emptyPage} />);

    expect(screen.getByRole('heading', { name: texts.emptyTitle })).toBeInTheDocument();
    expect(screen.getByText(texts.emptyText)).toBeInTheDocument();
  });

  it('пустой поиск объясняется иначе: база не пуста, в ней просто не нашлось', () => {
    render(<ClientList page={emptyPage} query="Соколова" />);

    expect(screen.getByRole('heading', { name: texts.emptyFound })).toBeInTheDocument();
    expect(screen.queryByText(texts.emptyText)).not.toBeInTheDocument();
  });
});
