import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Pager } from './Pager';

describe('Pager', () => {
  it('ведёт на соседние страницы и показывает положение', () => {
    render(<Pager page={2} pages={7} basePath="/admin/clients" />);

    expect(screen.getByRole('link', { name: '← Назад' })).toHaveAttribute('href', '/admin/clients');
    expect(screen.getByRole('link', { name: 'Дальше →' })).toHaveAttribute(
      'href',
      '/admin/clients?page=3',
    );
    expect(screen.getByText('2 из 7')).toBeInTheDocument();
  });

  it('на краях списка шаг перестаёт быть ссылкой', () => {
    const { rerender } = render(<Pager page={1} pages={3} basePath="/admin/clients" />);
    expect(screen.queryByRole('link', { name: '← Назад' })).not.toBeInTheDocument();

    rerender(<Pager page={3} pages={3} basePath="/admin/clients" />);
    expect(screen.queryByRole('link', { name: 'Дальше →' })).not.toBeInTheDocument();
  });

  it('🔴 поиск переезжает вместе со страницей: иначе «Дальше» сбрасывает запрос', () => {
    render(<Pager page={1} pages={4} basePath="/admin/clients" query={{ q: 'Соколов' }} />);

    expect(screen.getByRole('link', { name: 'Дальше →' })).toHaveAttribute(
      'href',
      '/admin/clients?q=%D0%A1%D0%BE%D0%BA%D0%BE%D0%BB%D0%BE%D0%B2&page=2',
    );
  });

  it('на одной странице не показывается вовсе', () => {
    const { container } = render(<Pager page={1} pages={1} basePath="/admin/clients" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('подписи переопределяются пропсами', () => {
    render(
      <Pager
        page={2}
        pages={5}
        basePath="/admin/orders"
        prevLabel="Предыдущие"
        nextLabel="Следующие"
        position={(current, total) => `Страница ${current} из ${total}`}
      />,
    );

    expect(screen.getByRole('link', { name: '← Предыдущие' })).toBeInTheDocument();
    expect(screen.getByText('Страница 2 из 5')).toBeInTheDocument();
  });

  /* 🔴 Граница контрола обязана держать 3:1 (WCAG 1.4.11, ADR-181): без неё
     кнопка разбивки не очерчена ничем: заливки у неё нет. `--line-strong` даёт 1,48:1 — вдвое ниже нормы. */
  it('🔴 граница не возвращается на --line-strong', () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'Pager.module.css'),
      'utf8',
    );

    expect(css).not.toContain('var(--line-strong)');
  });
});
