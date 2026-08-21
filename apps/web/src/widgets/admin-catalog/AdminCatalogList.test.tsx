import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminCatalogList } from './AdminCatalogList';
import { adminCatalogContent as texts } from './content';
import { catalogRowsFixture } from './fixtures';

describe('Список каталога в админке', () => {
  it('показывает и скрытые модели: скрытая — не отсутствующая', () => {
    render(<AdminCatalogList products={catalogRowsFixture} />);

    expect(screen.getByText('Сплит-система 18')).toBeInTheDocument();
    expect(screen.getByText(texts.hidden)).toBeInTheDocument();
  });

  it('каждая строка ведёт в правку своей модели', () => {
    render(<AdminCatalogList products={catalogRowsFixture} />);

    expect(screen.getByRole('link', { name: texts.editLabel('Сплит-система 09') })).toHaveAttribute(
      'href',
      '/admin/catalog/2',
    );
  });

  it('модель со скидкой помечена', () => {
    render(<AdminCatalogList products={catalogRowsFixture} />);

    expect(screen.getByText(new RegExp(texts.saleActive))).toBeInTheDocument();
  });

  it('пустой каталог объясняет, что видит посетитель', () => {
    render(<AdminCatalogList products={[]} />);

    expect(screen.getByText(texts.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
