import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Pager, pageWindowNumbers } from './Pager';

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

/**
 * Полоса номеров (issue #602, макет). Края, соседи текущей страницы и
 * многоточия на разрывах: полная лента на двадцати шести страницах — ряд, по
 * которому никто не целится.
 */
describe('Pager — номера страниц', () => {
  it('🔴 показывает края, соседей и многоточия вместо всей ленты', () => {
    expect(pageWindowNumbers(13, 26)).toEqual([1, 'gap', 12, 13, 14, 'gap', 26]);
  });

  it('короткий список показывается целиком — сворачивать нечего', () => {
    expect(pageWindowNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });

  /* Разрыв в одну страницу не сворачивается: «1 … 3» занимает столько же
     места, сколько «1 2 3», и прячет доступную страницу. */
  it('разрыв в одну страницу не сворачивается', () => {
    expect(pageWindowNumbers(4, 6)).toEqual([1, 'gap', 3, 4, 5, 6]);
  });

  it('текущая страница отмечена в разметке, а не только заливкой', () => {
    render(<Pager page={3} pages={9} basePath="/admin/clients" numbers />);

    expect(screen.getByText('3')).toHaveAttribute('aria-current', 'page');
  });

  it('номер — ссылка со своим именем: «3» в озвучке ничего не значит', () => {
    render(<Pager page={1} pages={9} basePath="/admin/clients" numbers />);

    expect(screen.getByRole('link', { name: 'Страница 2' })).toHaveAttribute(
      'href',
      '/admin/clients?page=2',
    );
  });

  it('поиск переезжает на соседнюю страницу вместе с номером', () => {
    render(<Pager page={1} pages={9} basePath="/admin/clients" query={{ q: 'Тула' }} numbers />);

    expect(screen.getByRole('link', { name: 'Страница 2' })).toHaveAttribute(
      'href',
      '/admin/clients?q=%D0%A2%D1%83%D0%BB%D0%B0&page=2',
    );
  });
});
