import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import {
  CATALOG_PAGE_SIZE,
  catalogFacets,
  parseCatalogQuery,
  selectCatalogPage,
} from '@/entities/product/lib/catalogQuery';

import { CatalogList } from './CatalogList';
import { catalogListText as t } from './content';
import {
  catalogFixture,
  expiredSaleProduct,
  NOW,
  plainProduct,
  productHrefFixture,
} from './fixtures';
import type { CatalogProduct } from './model';

const catalog: readonly CatalogProduct[] = [...catalogFixture, expiredSaleProduct];

/** Собирает блок так же, как это делает страница каталога. */
function renderList(
  products: readonly CatalogProduct[] = catalog,
  raw: Record<string, string> = {},
) {
  const query = parseCatalogQuery(raw);

  return render(
    <CatalogList
      page={selectCatalogPage(products, query, NOW)}
      facets={catalogFacets(products)}
      query={query}
      basePath="/catalog"
      productHref={productHrefFixture}
      orderHref="/#lead"
      now={NOW}
    />,
  );
}

/** Адрес ссылки фильтра по её подписи. */
function hrefOf(name: string | RegExp): string | null {
  return screen.getByRole('link', { name }).getAttribute('href');
}

describe('Каталог — подбор', () => {
  it('🔴 фильтры — ссылки: выбор живёт в адресе, а не в состоянии (ADR-109)', () => {
    renderList();

    expect(hrefOf('09')).toBe('/catalog?class=09');
    expect(hrefOf('25 м²')).toBe('/catalog?area=25');
    expect(hrefOf(t.filterSaleOn)).toBe('/catalog?sale=1');
  });

  it('🔴 значения фильтров берутся из моделей, а не из списка в коде', () => {
    renderList([plainProduct]);

    expect(screen.getByRole('link', { name: '07' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '09' })).not.toBeInTheDocument();
  });

  it('выбранное значение помечено как текущее', () => {
    renderList(catalog, { class: '09' });

    expect(screen.getByRole('link', { name: '09' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: t.filterAny })).not.toHaveAttribute('aria-current');
  });

  it('фильтры складываются друг с другом, не затирая соседний', () => {
    renderList(catalog, { class: '09' });

    expect(hrefOf('25 м²')).toBe('/catalog?class=09&area=25');
  });

  it('🔴 смена фильтра возвращает на первую страницу', () => {
    renderList(catalog, { page: '2' });

    expect(hrefOf('09')).toBe('/catalog?class=09');
  });

  it('сброс ведёт на чистый адрес каталога', () => {
    renderList(catalog, { class: '09' });

    expect(hrefOf(t.reset)).toBe('/catalog');
  });

  it('без подбора сбрасывать нечего — ссылки нет', () => {
    renderList();

    expect(screen.queryByRole('link', { name: t.reset })).not.toBeInTheDocument();
  });

  it('набор значений не зависит от выборки: вернуться к другому классу есть куда', () => {
    renderList(catalog, { class: '09' });

    for (const value of ['07', '09', '12', '18', '24']) {
      expect(screen.getByRole('link', { name: value })).toBeInTheDocument();
    }
  });
});

describe('Каталог — порядок', () => {
  it('порядок задаётся адресом и подсвечивает выбранное', () => {
    renderList(catalog, { sort: 'price-asc' });

    expect(hrefOf(t.sortPriceDesc)).toBe('/catalog?sort=price-desc');
    expect(screen.getByRole('link', { name: t.sortPriceAsc })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('порядок не теряет выбранный фильтр', () => {
    renderList(catalog, { class: '09' });

    expect(hrefOf(t.sortPriceAsc)).toBe('/catalog?class=09&sort=price-asc');
  });
});

describe('Каталог — выдача', () => {
  it('показывает найденные модели и их количество', () => {
    renderList(catalog, { class: '09' });

    expect(screen.getByText(t.found(1))).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Сплит-система 09' })).toBeInTheDocument();
  });

  it('карточка ведёт на страницу модели', () => {
    renderList([plainProduct]);

    const card = within(screen.getByRole('listitem'));
    expect(card.getByRole('link', { name: 'Сплит-система 07' })).toHaveAttribute(
      'href',
      '/catalog/split-07',
    );
  });

  it('пустая выдача объясняет, что делать, и оставляет путь к заявке', () => {
    renderList(catalog, { class: '09', area: '70' });

    expect(screen.getByText(t.nothingTitle)).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Заказать' })).toHaveAttribute('href', '/#lead');
  });
});

describe('Каталог — разбивка', () => {
  const many: readonly CatalogProduct[] = Array.from(
    { length: CATALOG_PAGE_SIZE + 4 },
    (_, index) => ({ ...plainProduct, id: `p${index}`, slug: `p${index}`, sort: index }),
  );

  it('длинный каталог режется на страницы, ссылка «дальше» ведёт на вторую', () => {
    renderList(many);

    expect(screen.getAllByRole('listitem')).toHaveLength(CATALOG_PAGE_SIZE);
    expect(hrefOf(/Дальше/)).toBe('/catalog?page=2');
  });

  it('🔴 разбивка не теряет фильтр: иначе «дальше» уводит из подбора', () => {
    renderList(many, { class: '07', sort: 'price-asc' });

    expect(hrefOf(/Дальше/)).toBe('/catalog?class=07&sort=price-asc&page=2');
  });

  it('короткий каталог разбивки не показывает', () => {
    renderList(catalog);

    expect(screen.queryByRole('navigation', { name: t.pagerLabel })).not.toBeInTheDocument();
  });
});
