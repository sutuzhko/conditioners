import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClientList } from './ClientList';
import { clientManagerContent as texts } from './content';
import { emptyPage, longPage, page } from './fixtures';

describe('Список клиентов', () => {
  it('показывает карточки страницы', () => {
    render(<ClientList page={page} />);

    expect(screen.getByRole('heading', { name: 'Ирина Соколова' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Пётр Ильин' })).toBeInTheDocument();
  });

  it('на одной странице разбивки нет', () => {
    render(<ClientList page={page} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
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
