import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminNav } from './AdminNav';
import { sectionsFor } from './content';

const pathname = vi.fn(() => '/admin/catalog');

vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
}));

beforeEach(() => {
  pathname.mockReturnValue('/admin/catalog');
});

describe('Навигация панели', () => {
  it('показывает все разделы', () => {
    render(<AdminNav role="owner" />);

    for (const section of sectionsFor('owner')) {
      expect(screen.getByRole('link', { name: section.title })).toHaveAttribute(
        'href',
        section.href,
      );
    }
  });

  it('подсвечивает открытый раздел', () => {
    render(<AdminNav role="owner" />);

    expect(screen.getByRole('link', { name: 'Каталог' })).toHaveAttribute('aria-current', 'page');
  });

  it('на вложенной странице подсвечен её раздел, а не пусто', () => {
    pathname.mockReturnValue('/admin/catalog/42');
    render(<AdminNav role="owner" />);

    expect(screen.getByRole('link', { name: 'Каталог' })).toHaveAttribute('aria-current', 'page');
  });

  it('раздел с похожим началом адреса чужую подсветку не забирает', () => {
    pathname.mockReturnValue('/admin/crm');
    render(<AdminNav role="owner" />);

    expect(screen.getByRole('link', { name: 'Каталог' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Календарь работ' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('страницу не прокручивает: лента разделов двигается сама, а не тянет за собой экран', () => {
    const scrolled = vi.spyOn(window, 'scrollTo');
    render(<AdminNav role="owner" />);

    expect(scrolled).not.toHaveBeenCalled();
    // в jsdom лента не прокручивается (нулевые размеры) — и трогать её нечем
    expect(screen.getByRole('navigation').querySelector('ul')?.scrollLeft).toBe(0);
  });

  it('монтажник видит только свои разделы: ни каталога, ни заявок', () => {
    pathname.mockReturnValue('/admin/crm');
    render(<AdminNav role="installer" />);

    expect(screen.getByRole('link', { name: 'Календарь работ' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Профиль' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Каталог' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Заявки' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Монтажники' })).not.toBeInTheDocument();
  });
});
