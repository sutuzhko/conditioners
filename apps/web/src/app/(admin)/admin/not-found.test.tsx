import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ADMIN_ROLES } from '@/entities/staff/model';
import { columnSectionsFor } from '@/widgets/admin-shell';

import { PANEL_NOT_FOUND_CONTENT as t } from './not-found-content';
import { PanelNotFoundView } from './PanelNotFoundView';

describe('Страницы «не найдено» в панели', () => {
  it('объясняют ошибку одним заголовком первого уровня', () => {
    render(<PanelNotFoundView kind="address" role="owner" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.address.title);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('🔴 отличают несуществующий адрес от удалённой записи', () => {
    const { unmount } = render(<PanelNotFoundView kind="address" role="owner" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.address.title);
    unmount();

    render(<PanelNotFoundView kind="record" role="owner" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.record.title);
  });

  it('владельца возвращают на сводку', () => {
    render(<PanelNotFoundView kind="address" role="owner" />);

    expect(screen.getByRole('link', { name: t.owner.label })).toHaveAttribute('href', t.owner.href);
  });

  it('🔴 монтажника возвращают на его выезды, а не на сводку: сводка ответила бы отказом', () => {
    render(<PanelNotFoundView kind="record" role="installer" />);

    expect(screen.getByRole('link', { name: t.installer.label })).toHaveAttribute(
      'href',
      t.installer.href,
    );

    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toEqual([t.installer.href]);
  });

  /**
   * 🔴 Выход обязан вести туда, куда роль пускают (ADR-344).
   *
   * До четырёх ролей ветка была одна — «владелец или все остальные», — и
   * «остальные» означало монтажника. Менеджеру та же ветка предлагала бы
   * календарь выездов, который отвечает ему отказом: из тупика в тупик.
   * Сверяем не подпись, а адрес — с первым разделом колонки этой роли.
   */
  it.each(ADMIN_ROLES)('роль %s возвращают в её собственный первый раздел', (role) => {
    render(<PanelNotFoundView kind="address" role={role} />);

    const first = columnSectionsFor(role)[0];

    expect(first, `у роли ${role} нет ни одного раздела колонки`).toBeDefined();
    expect(t[role].href).toBe(first?.href);
    expect(screen.getByRole('link', { name: t[role].label })).toHaveAttribute('href', t[role].href);
  });

  it('🔴 не содержат ни одного факта о компании', () => {
    const { container } = render(<PanelNotFoundView kind="address" role="owner" />);

    expect(container.textContent).not.toMatch(/\+7|\d{3}-\d{2}-\d{2}/);
  });
});
