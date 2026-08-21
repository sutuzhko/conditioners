import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { NOT_FOUND_CONTENT, NOT_FOUND_ROUTES } from '@/shared/seo';

import NotFound from './not-found';

describe('Страница 404', () => {
  it('объясняет ошибку одним заголовком первого уровня', () => {
    render(<NotFound />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(NOT_FOUND_CONTENT.title);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('уводит в разделы сайта, а не в тупик', () => {
    render(<NotFound />);

    for (const route of NOT_FOUND_ROUTES) {
      expect(screen.getByRole('link', { name: route.title })).toHaveAttribute('href', route.path);
    }
  });

  it('🔴 ведёт на главную: шапки с логотипом на этой странице нет', () => {
    render(<NotFound />);

    expect(screen.getByRole('link', { name: NOT_FOUND_CONTENT.homeLink })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('политики в списке разделов нет — она тут только мешает', () => {
    render(<NotFound />);

    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).not.toContain('/privacy');
  });

  it('🔴 не содержит ни одного факта о компании', () => {
    const { container } = render(<NotFound />);

    // ни телефона, ни адреса: страница ошибки ничего не обещает (инвариант 8)
    expect(container.textContent).not.toMatch(/\+7|\d{3}-\d{2}-\d{2}/);
  });
});
