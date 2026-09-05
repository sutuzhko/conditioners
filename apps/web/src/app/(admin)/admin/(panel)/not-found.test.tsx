import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PANEL_NOT_FOUND_CONTENT as t } from './not-found-content';
import { PanelNotFoundView } from './PanelNotFoundView';

describe('Страница «не найдено» в панели', () => {
  it('объясняет ошибку одним заголовком первого уровня', () => {
    render(<PanelNotFoundView role="owner" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.title);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('владельца возвращает на сводку', () => {
    render(<PanelNotFoundView role="owner" />);

    expect(screen.getByRole('link', { name: t.owner.label })).toHaveAttribute('href', t.owner.href);
  });

  it('🔴 монтажника возвращает на его выезды, а не на сводку: сводка ответила бы отказом', () => {
    render(<PanelNotFoundView role="installer" />);

    expect(screen.getByRole('link', { name: t.installer.label })).toHaveAttribute(
      'href',
      t.installer.href,
    );

    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toEqual([t.installer.href]);
  });

  it('🔴 не содержит ни одного факта о компании', () => {
    const { container } = render(<PanelNotFoundView role="owner" />);

    expect(container.textContent).not.toMatch(/\+7|\d{3}-\d{2}-\d{2}/);
  });
});
