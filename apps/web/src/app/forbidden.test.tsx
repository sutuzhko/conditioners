import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ADMIN_ROLES } from '@/entities/staff/model';
import { columnSectionsFor } from '@/widgets/admin-shell';

/* Граница отказа сама читает сессию — иначе роль до неё не доходит. Подмена
   целиком: настоящий модуль тянет за собой ENV и Prisma, а проверяется здесь
   не чтение cookie, а то, чья роль доезжает до кнопки выхода. */
vi.mock('@/server/auth', () => ({ getAdminSession: vi.fn() }));

import { getAdminSession } from '@/server/auth';

import Forbidden from './forbidden';
import { FORBIDDEN_CONTENT } from './forbidden-content';
import { ForbiddenView } from './ForbiddenView';

describe('Страница 403', () => {
  it('объясняет отказ одним заголовком первого уровня', () => {
    render(<ForbiddenView role="installer" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(FORBIDDEN_CONTENT.title);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('🔴 уводит на рабочий экран: шапки панели на этой странице нет', () => {
    render(<ForbiddenView role="installer" />);

    expect(screen.getByRole('link', { name: FORBIDDEN_CONTENT.installer.label })).toHaveAttribute(
      'href',
      FORBIDDEN_CONTENT.installer.href,
    );
  });

  /**
   * 🔴 Выход обязан вести туда, куда роль пускают.
   *
   * Пока ролей было две, выход был один — календарь монтажника. Менеджеру тот
   * же адрес отвечает отказом, то есть отказ вёл бы в отказ, и человек ходил
   * бы по кругу. Проверяется не текст ссылки, а совпадение её адреса с первым
   * разделом колонки этой роли: расхождение здесь и есть тупик (ADR-344).
   */
  it.each(ADMIN_ROLES)('роль %s уводит в её собственный первый раздел', (role) => {
    render(<ForbiddenView role={role} />);

    const exit = FORBIDDEN_CONTENT[role];
    const first = columnSectionsFor(role)[0];

    expect(first, `у роли ${role} нет ни одного раздела колонки`).toBeDefined();
    expect(exit.href).toBe(first?.href);
    expect(screen.getByRole('link', { name: exit.label })).toHaveAttribute('href', exit.href);
  });

  /* Сессия истекла между проверкой доступа и отрисовкой отказа: звать в раздел
     панели уже некуда, но ответ остаётся 403 — на вход зовём ссылкой. */
  it('без сессии предлагает войти, а не разворачивает', () => {
    render(<ForbiddenView role={null} />);

    expect(screen.getByRole('link', { name: FORBIDDEN_CONTENT.guest.label })).toHaveAttribute(
      'href',
      FORBIDDEN_CONTENT.guest.href,
    );
  });

  it('🔴 не зовёт в закрытые разделы — их адресов здесь нет', () => {
    render(<ForbiddenView role="installer" />);

    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toEqual([FORBIDDEN_CONTENT.installer.href]);
  });

  it('🔴 не содержит ни одного факта о компании', () => {
    const { container } = render(<ForbiddenView role="installer" />);

    expect(container.textContent).not.toMatch(/\+7|\d{3}-\d{2}-\d{2}/);
  });
});

/**
 * Сама граница отказа: роль берётся из сессии этого запроса.
 *
 * 🔴 Проверяется именно она, а не только разметка. Next не передаёт границе
 * ничего от раскладки, и без чтения сессии выход снова стал бы одним на всех
 * (ADR-344): менеджер уезжал бы на календарь выездов, который отвечает ему
 * тем же отказом.
 */
describe('граница отказа', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('уводит вошедшего в раздел его роли', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({
      userId: 'u3',
      login: 'lebedeva',
      name: null,
      role: 'manager',
      expiresAt: new Date('2026-12-31'),
    });

    render(await Forbidden());

    expect(screen.getByRole('link', { name: FORBIDDEN_CONTENT.manager.label })).toHaveAttribute(
      'href',
      FORBIDDEN_CONTENT.manager.href,
    );
  });

  it('истёкшую сессию зовёт на вход', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    render(await Forbidden());

    expect(screen.getByRole('link', { name: FORBIDDEN_CONTENT.guest.label })).toHaveAttribute(
      'href',
      FORBIDDEN_CONTENT.guest.href,
    );
  });
});
