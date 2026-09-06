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

  /* 🔴 Набор действий строки повторяет набор карточки (issue #575): до этого
     список давал только «Править», и об удалении узнавал лишь тот, кто открыл
     карточку и долистал форму до низа. */
  it('строка даёт открыть, править и убрать, не открывая карточку', () => {
    render(<AdminCatalogList products={catalogRowsFixture} />);

    const name = plain?.name ?? '';
    const actions = screen.getByRole('group', { name: texts.rowActions(name) });

    expect(within(actions).getByRole('link', { name: texts.viewLabel(name) })).toHaveAttribute(
      'href',
      `/catalog/${plain?.slug ?? ''}`,
    );
    expect(within(actions).getByRole('link', { name: texts.editLabel(name) })).toHaveAttribute(
      'href',
      `/admin/catalog/${plain?.id ?? ''}`,
    );
    expect(
      within(actions).getByRole('button', { name: productFormContent.removeLabel(name) }),
    ).toBeInTheDocument();
  });

  /* 🔴 Страницы скрытой модели на сайте нет — она отдаёт 404 (ADR-109).
     Действие не исчезает из ряда, а стоит отключённым и называет причину. */
  it('у скрытой модели «Смотреть на сайте» отключено и объясняет почему', () => {
    render(<AdminCatalogList products={catalogRowsFixture} />);

    const name = invisible?.name ?? '';
    const actions = screen.getByRole('group', { name: texts.rowActions(name) });

    expect(within(actions).queryByRole('link', { name: texts.viewLabel(name) })).toBeNull();
    expect(
      within(actions).getByRole('button', { name: texts.viewHiddenLabel(name) }),
    ).toBeDisabled();
  });

  /* 🔴 Пусто из-за отбора и пусто вообще — разные новости с противоположными
     шагами (issue #335): в одном случае надо завести модель, в другом — снять
     условие. */
  it('пусто из-за отбора предлагает снять отбор, а не завести модель', () => {
    render(<AdminCatalogList products={[]} filtered />);

    expect(screen.getByText(texts.emptyFilteredTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: texts.emptyFilteredAction })).toHaveAttribute(
      'href',
      '/admin/catalog',
    );
  });
});
