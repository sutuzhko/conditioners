import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderList } from './OrderList';
import { orderManagerContent as texts } from './content';
import { emptyPage, page } from './fixtures';

describe('Список нарядов', () => {
  it('рисует все наряды страницы', () => {
    render(<OrderList page={page} />);

    expect(screen.getAllByRole('article')).toHaveLength(page.items.length);
  });

  it('🔴 пустой список без фильтра зовёт завести первый наряд', () => {
    render(<OrderList page={emptyPage} />);

    expect(screen.getByText(texts.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.emptyText)).toBeInTheDocument();
  });

  it('🔴 пустой список по фильтру объясняется иначе: наряд в другой стопке', () => {
    render(<OrderList page={emptyPage} filters={{ tab: 'cancelled' }} />);

    expect(screen.getByText(texts.emptyFound)).toBeInTheDocument();
    expect(screen.queryByText(texts.emptyText)).not.toBeInTheDocument();
  });

  it('поиск без находок — тоже фильтр, а не пустая база', () => {
    render(<OrderList page={emptyPage} filters={{ query: '9999' }} />);

    expect(screen.getByText(texts.emptyFound)).toBeInTheDocument();
  });

  it('монтажнику пустота объясняется его словами', () => {
    render(<OrderList page={emptyPage} forInstaller />);

    expect(screen.getByText(texts.emptyInstaller)).toBeInTheDocument();
  });
});
