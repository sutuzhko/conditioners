import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { productFormContent } from '@/features/product-form';
import { formatMoney } from '@/shared/lib/format';

import { AdminCatalogList } from './AdminCatalogList';
import { adminCatalogContent as texts } from './content';
import { catalogRowsFixture } from './fixtures';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const [plain, discounted, invisible] = catalogRowsFixture;

/* Неразрывные пробелы цены Testing Library приводит к обычным — сравниваем в
   том же виде, в каком она читает текст. */
const money = (value: number): string => formatMoney(value).replace(/\s/g, ' ');

describe('Список каталога в админке', () => {
  it('показывает и скрытые модели: скрытая — не отсутствующая', () => {
    render(<AdminCatalogList products={catalogRowsFixture} />);

    expect(screen.getByText(invisible?.name ?? '')).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: productFormContent.visibleLabel(invisible?.name ?? '') }),
    ).not.toBeChecked();
  });

  it('каждая строка ведёт в правку своей модели', () => {
    render(<AdminCatalogList products={catalogRowsFixture} />);

    expect(
      screen.getByRole('link', { name: texts.editLabel(discounted?.name ?? '') }),
    ).toHaveAttribute('href', '/admin/catalog/2');
  });

  /**
   * 🔴 Главная цифра строки — действующая цена, а не базовая (инвариант 14,
   * ADR-011): именно её видит посетитель. Прежняя цена перечёркнута рядом, и
   * процент вычислен доменом, а не введён руками.
   */
  it('главной цифрой ставит действующую цену, прежнюю перечёркивает', () => {
    render(<AdminCatalogList products={catalogRowsFixture} />);

    const row = screen.getByRole('row', { name: new RegExp(discounted?.name ?? '') });

    expect(within(row).getByText(money(discounted?.currentPrice ?? 0))).toBeInTheDocument();
    expect(within(row).getByText(money(discounted?.oldPrice ?? 0))).toBeInTheDocument();
    expect(within(row).getByText(texts.discount(discounted?.discountPercent ?? 0))).toBeVisible();
  });

  /**
   * 🔴 Строка про скидку есть у каждой модели: без неё блок цены у моделей со
   * скидкой и без был бы разной высоты, и главная цифра плясала бы по ряду
   * (issue #354).
   */
  it('у модели без скидки строка скидки не исчезает, а называет её отсутствие', () => {
    render(<AdminCatalogList products={catalogRowsFixture} />);

    const row = screen.getByRole('row', { name: new RegExp(plain?.name ?? '') });

    expect(within(row).getByText(texts.noSale)).toBeInTheDocument();
  });

  it('пустой каталог объясняет, что видит посетитель', () => {
    render(<AdminCatalogList products={[]} />);

    expect(screen.getByText(texts.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
