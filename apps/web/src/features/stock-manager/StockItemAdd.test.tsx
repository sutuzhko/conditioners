import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StockItemAdd } from './StockItemAdd';
import { stockManagerContent as texts } from './content';
import { acceptingApi, products } from './fixtures';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe('Добавление позиции', () => {
  it('форма свёрнута: раздел открывают ради остатков', () => {
    render(<StockItemAdd api={acceptingApi} products={products} />);

    expect(screen.queryByLabelText(texts.itemName)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.itemAddOpen })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('разворачивается по кнопке и сообщает об этом скринридеру', async () => {
    const user = userEvent.setup();
    render(<StockItemAdd api={acceptingApi} products={products} />);

    await user.click(screen.getByRole('button', { name: texts.itemAddOpen }));

    expect(screen.getByLabelText(texts.itemName)).toBeVisible();
    expect(screen.getByRole('button', { name: texts.itemAddClose })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
