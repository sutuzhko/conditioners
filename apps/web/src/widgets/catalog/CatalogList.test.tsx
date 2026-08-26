import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import {
  CATALOG_PAGE_SIZE,
  catalogFacets,
  parseCatalogQuery,
  selectCatalogCompare,
  selectCatalogPage,
} from '@/entities/product/lib/catalogQuery';

import { CatalogList } from './CatalogList';
import { catalogListText as t, catalogText, compareChipLabel, compareMarkLabel } from './content';
import {
  catalogFixture,
  expiredSaleProduct,
  NOW,
  plainProduct,
  productHrefFixture,
  specDictionaryFixture,
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
      compared={selectCatalogCompare(products, query.compare)}
      basePath="/catalog"
      productHref={productHrefFixture}
      orderHref="/#lead"
      now={NOW}
      specDictionary={specDictionaryFixture}
    />,
  );
}

/** Строка сравнения по названию характеристики: заголовок строки + её ячейки. */
function specRow(name: string): readonly string[] {
  const header = screen.getByRole('rowheader', { name });
  const row = header.closest('tr');
  if (row === null) throw new Error(`Строка «${name}» не найдена`);
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '');
}

/**
 * Подписи колонок таблицы сравнения. Берутся из первой строки: заголовки
 * групп характеристик — тоже `columnheader`, и общий поиск смешал бы их
 * с названиями моделей.
 */
function columnHeaders(): readonly (string | null)[] {
  const [head] = screen.getAllByRole('row');
  if (head === undefined) throw new Error('Шапка таблицы не найдена');
  return within(head)
    .getAllByRole('columnheader')
    .map((cell) => cell.textContent);
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

describe('Каталог — сравнение по выбору (ADR-109)', () => {
  it('🔴 отметка — ссылка, добавляющая слаг в адрес, а не состояние на клиенте', () => {
    renderList();

    expect(hrefOf(compareMarkLabel('Сплит-система 07', false))).toBe(
      '/catalog?compare=split-07#compare',
    );
  });

  it('🔴 повторное нажатие убирает слаг: подпись и адрес меняются вместе', () => {
    renderList(catalog, { compare: 'split-07,split-12' });

    const mark = screen.getByRole('link', { name: compareMarkLabel('Сплит-система 07', true) });
    expect(mark).toHaveAttribute('href', '/catalog?compare=split-12#compare');
    expect(mark).toHaveAttribute('aria-current', 'true');
  });

  it('🔴 состояние отметки читается подписью, а не одним цветом', () => {
    renderList(catalog, { compare: 'split-07' });

    // подпись отмеченной модели сообщает и состояние, и что нажатие его снимет
    const picked = screen.getByRole('link', { name: compareMarkLabel('Сплит-система 07', true) });
    expect(picked).toHaveTextContent(catalogText.compareOn);
    expect(picked).toHaveAccessibleName(expect.stringContaining(catalogText.compareRemove));

    const free = screen.getByRole('link', { name: compareMarkLabel('Сплит-система 09', false) });
    expect(free).toHaveTextContent(catalogText.compareAdd);
  });

  it('🔴 отметка не сбрасывает подбор: снятие возвращает тот же отфильтрованный адрес', () => {
    renderList(catalog, { class: '07', compare: 'split-07' });

    expect(hrefOf(compareMarkLabel('Сплит-система 07', true))).toBe('/catalog?class=07#compare');
  });

  it('🔴 отметка не выбрасывает со страницы: состав выдачи она не меняет', () => {
    const many: readonly CatalogProduct[] = Array.from(
      { length: CATALOG_PAGE_SIZE + 2 },
      (_, index) => ({
        ...plainProduct,
        id: `p${index}`,
        slug: `p${index}`,
        name: `Сплит-система ${index}`,
        sort: index,
      }),
    );

    renderList(many, { page: '2' });

    expect(hrefOf(compareMarkLabel('Сплит-система 12', false))).toBe(
      '/catalog?page=2&compare=p12#compare',
    );
  });

  it('🔴 смена фильтра сохраняет отметки: выбор клиента её переживает', () => {
    renderList(catalog, { compare: 'split-07' });

    expect(hrefOf('09')).toBe('/catalog?class=09&compare=split-07');
  });

  it('разбивка тоже несёт выбор с собой', () => {
    const many: readonly CatalogProduct[] = Array.from(
      { length: CATALOG_PAGE_SIZE + 2 },
      (_, index) => ({ ...plainProduct, id: `p${index}`, slug: `p${index}`, sort: index }),
    );

    renderList(many, { compare: 'p0' });

    expect(hrefOf(/Дальше/)).toBe('/catalog?compare=p0&page=2');
  });

  it('🔴 порядок колонок — порядок слагов в адресе, а не порядок каталога', () => {
    renderList(catalog, { compare: 'split-12,split-07' });

    expect(columnHeaders()).toEqual(['Характеристика', 'Сплит-система 12', 'Сплит-система 07']);
  });

  it('🔴 строки — объединение ключей отмеченных моделей, прочерк вместо пустого (инвариант 6)', () => {
    renderList(catalog, { compare: 'split-07,split-12' });

    // «Wi-Fi управление» есть только у одной модели — строка обязана появиться
    expect(specRow('Wi-Fi управление')).toEqual(['—', 'Есть']);
    expect(specRow('Обогрев до')).toEqual(['−15 °C', '—']);
  });

  it('🔴 неотмеченная модель в таблицу не попадает, даже если она в выдаче', () => {
    renderList(catalog, { compare: 'split-07,split-12' });

    expect(columnHeaders()).not.toContain('Сплит-система 18');
  });

  it('замыкается ценой под ключ — той же, что на карточке', () => {
    renderList(catalog, { compare: 'split-07,split-09' });

    const row = screen.getByRole('rowheader', { name: catalogText.comparePrice }).closest('tr');
    if (row === null) throw new Error('Строка цены не найдена');

    expect(within(row).getByText('34 900 ₽')).toBeInTheDocument();
    // у модели со скидкой в сравнении стоит действующая цена, а не перечёркнутая
    expect(within(row).getByText('33 900 ₽')).toBeInTheDocument();
  });

  it('справочник задаёт порядок строк и подписывает группы (ADR-094)', () => {
    renderList(catalog, { compare: 'split-07,split-12' });

    expect(screen.getAllByRole('columnheader', { name: 'Основное' }).length).toBeGreaterThan(0);
  });

  it('прокручивается внутри своего контейнера, а не растягивает страницу', () => {
    renderList(catalog, { compare: 'split-07,split-12' });

    const region = screen.getByRole('region', { name: /прокручивается по горизонтали/i });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(screen.getByRole('table'));
  });

  it('🔴 незнакомый слаг молча выпадает и не тащится дальше по ссылкам', () => {
    renderList(catalog, { compare: 'нет-такой,split-07' });

    expect(
      screen.getByRole('link', { name: compareMarkLabel('Сплит-система 07', true) }),
    ).toBeInTheDocument();
    expect(hrefOf('09')).toBe('/catalog?class=09&compare=split-07');
  });

  it('очистка снимает сравнение, оставляя подбор на месте', () => {
    renderList(catalog, { class: '09', compare: 'split-09' });

    expect(hrefOf(t.compareClear)).toBe('/catalog?class=09');
  });
});

describe('Каталог — сравнение, вырожденные состояния', () => {
  it('ничего не отмечено — приглашение вместо пустой таблицы', () => {
    renderList();

    expect(screen.getByText(t.compareHint)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t.compareClear })).not.toBeInTheDocument();
  });

  it('🔴 отмечена одна — выбор виден, но таблицы нет: сравнивать не с чем', () => {
    renderList(catalog, { compare: 'split-07' });

    expect(screen.getByText(t.compareAlone)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: t.compareChosen })).getByRole('link', {
        name: compareChipLabel('Сплит-система 07'),
      }),
    ).toHaveAttribute('href', '/catalog#compare');
  });

  it('отмечены все — таблица со всеми колонками и цена в каждой', () => {
    const slugs = catalog.map((product) => product.slug).join(',');
    renderList(catalog, { compare: slugs });

    expect(columnHeaders()).toHaveLength(catalog.length + 1);
  });

  it('у отмеченных моделей нет характеристик — остаётся цена и честная сноска', () => {
    const bare: readonly CatalogProduct[] = catalog.map((product) => ({ ...product, specs: [] }));
    renderList(bare, { compare: 'split-07,split-09' });

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: catalogText.comparePrice })).toBeInTheDocument();
    expect(screen.getByText(catalogText.compareNoSpecs)).toBeInTheDocument();
  });
});
