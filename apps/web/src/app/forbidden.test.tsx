import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { FORBIDDEN_CONTENT } from './forbidden-content';
import { ForbiddenView as Forbidden } from './ForbiddenView';

describe('Страница 403', () => {
  it('объясняет отказ одним заголовком первого уровня', () => {
    render(<Forbidden />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(FORBIDDEN_CONTENT.title);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('🔴 уводит на рабочий экран: шапки панели на этой странице нет', () => {
    render(<Forbidden />);

    expect(screen.getByRole('link', { name: FORBIDDEN_CONTENT.workLink })).toHaveAttribute(
      'href',
      FORBIDDEN_CONTENT.workHref,
    );
  });

  it('🔴 не зовёт в закрытые разделы — их адресов здесь нет', () => {
    render(<Forbidden />);

    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toEqual([FORBIDDEN_CONTENT.workHref]);
  });

  it('🔴 не содержит ни одного факта о компании', () => {
    const { container } = render(<Forbidden />);

    expect(container.textContent).not.toMatch(/\+7|\d{3}-\d{2}-\d{2}/);
  });
});
