import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminNav } from './AdminNav';
import { ADMIN_SECTIONS } from './content';

const pathname = vi.fn(() => '/admin/catalog');

vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
}));

beforeEach(() => {
  pathname.mockReturnValue('/admin/catalog');
});

describe('Навигация панели', () => {
  it('показывает все разделы', () => {
    render(<AdminNav />);

    for (const section of ADMIN_SECTIONS) {
      expect(screen.getByRole('link', { name: section.title })).toHaveAttribute(
        'href',
        section.href,
      );
    }
  });

  it('подсвечивает открытый раздел', () => {
    render(<AdminNav />);

    expect(screen.getByRole('link', { name: 'Каталог' })).toHaveAttribute('aria-current', 'page');
  });

  it('на вложенной странице подсвечен её раздел, а не пусто', () => {
    pathname.mockReturnValue('/admin/catalog/42');
    render(<AdminNav />);

    expect(screen.getByRole('link', { name: 'Каталог' })).toHaveAttribute('aria-current', 'page');
  });

  it('раздел с похожим началом адреса чужую подсветку не забирает', () => {
    pathname.mockReturnValue('/admin/crm');
    render(<AdminNav />);

    expect(screen.getByRole('link', { name: 'Каталог' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Календарь работ' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('страницу не прокручивает: лента разделов двигается сама, а не тянет за собой экран', () => {
    const scrolled = vi.spyOn(window, 'scrollTo');
    render(<AdminNav />);

    expect(scrolled).not.toHaveBeenCalled();
    // в jsdom лента не прокручивается (нулевые размеры) — и трогать её нечем
    expect(screen.getByRole('navigation').querySelector('ul')?.scrollLeft).toBe(0);
  });
});
