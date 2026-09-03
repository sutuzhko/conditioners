import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { reviewModerationContent as texts } from './content';
import { ReviewTabs } from './ReviewTabs';

/** Разбирает `href` вкладки в набор параметров — порядок ключей неважен. */
function hrefOf(name: string): string {
  return screen.getByRole('link', { name }).getAttribute('href') ?? '';
}

describe('Вкладки модерации', () => {
  it('четыре вкладки макета, все ссылками', () => {
    render(<ReviewTabs active="pending" />);

    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('🔴 ключ и значения по-английски: `?tab=published`, а не транслит', () => {
    render(<ReviewTabs active="pending" />);

    expect(hrefOf(texts.tabTitle('published'))).toBe('/admin/reviews?tab=published');
    expect(hrefOf(texts.tabTitle('rejected'))).toBe('/admin/reviews?tab=rejected');
    expect(hrefOf(texts.tabTitle('all'))).toBe('/admin/reviews?tab=all');
  });

  it('умолчание в адрес не уезжает: «На модерации» — это просто раздел', () => {
    render(<ReviewTabs active="all" />);

    expect(hrefOf(texts.tabTitle('pending'))).toBe('/admin/reviews');
  });

  it('открытая вкладка отмечена для скринридера, а не только цветом', () => {
    render(<ReviewTabs active="rejected" />);

    expect(screen.getByRole('link', { name: texts.tabTitle('rejected') })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: texts.tabTitle('all') })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('заготовка раздела не подсвечивает ни одной вкладки: адреса она не знает', () => {
    render(<ReviewTabs />);

    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-current');
    }
  });
});
