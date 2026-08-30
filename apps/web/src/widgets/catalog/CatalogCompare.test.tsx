import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { parseCatalogQuery, selectCatalogCompare } from '@/entities/product/lib/catalogQuery';

import { CatalogCompare } from './CatalogCompare';
import { catalogListText as t, catalogText, compareChipLabel, productPageText } from './content';
import { catalogFixture, expiredSaleProduct, NOW, specDictionaryFixture } from './fixtures';
import type { CatalogProduct } from './model';

const catalog: readonly CatalogProduct[] = [...catalogFixture, expiredSaleProduct];

/** Собирает страницу сравнения так же, как это делает маршрут `/compare`. */
function renderCompare(
  raw: Record<string, string> = {},
  products: readonly CatalogProduct[] = catalog,
) {
  const query = parseCatalogQuery(raw);

  return render(
    <CatalogCompare
      products={selectCatalogCompare(products, query.compare)}
      query={query}
      basePath="/compare"
      catalogPath="/catalog"
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

function hrefOf(name: string | RegExp): string | null {
  return screen.getByRole('link', { name }).getAttribute('href');
}

describe('Сравнение — таблица (ADR-109)', () => {
  it('🔴 порядок колонок — порядок слагов в адресе, а не порядок каталога', () => {
    renderCompare({ compare: 'split-12,split-07' });

    expect(columnHeaders()).toEqual(['Характеристика', 'Сплит-система 12', 'Сплит-система 07']);
  });

  it('🔴 строки — объединение ключей отмеченных моделей, прочерк вместо пустого (инвариант 6)', () => {
    renderCompare({ compare: 'split-07,split-12' });

    // «Wi-Fi управление» есть только у одной модели — строка обязана появиться
    expect(specRow('Wi-Fi управление')).toEqual(['—', 'Есть']);
    expect(specRow('Обогрев до')).toEqual(['−15 °C', '—']);
  });

  it('🔴 неотмеченная модель в таблицу не попадает', () => {
    renderCompare({ compare: 'split-07,split-12' });

    expect(columnHeaders()).not.toContain('Сплит-система 18');
  });

  it('открывается ценой под ключ — той же, что на карточке', () => {
    renderCompare({ compare: 'split-07,split-09' });

    const row = screen.getByRole('rowheader', { name: catalogText.comparePrice }).closest('tr');
    if (row === null) throw new Error('Строка цены не найдена');

    expect(within(row).getByText('34 900 ₽')).toBeInTheDocument();
    // у модели со скидкой в сравнении стоит действующая цена, а не перечёркнутая
    expect(within(row).getByText('33 900 ₽')).toBeInTheDocument();
  });

  it('🔴 цена идёт первой строкой: ради неё таблицу и открывают (issue #263)', () => {
    renderCompare({ compare: 'split-07,split-09' });

    const body = screen.getByRole('table').querySelector('tbody');
    if (body === null) throw new Error('Тела таблицы нет');

    expect(body.rows[0]?.querySelector('th')?.textContent).toBe(catalogText.comparePrice);
  });

  it('справочник задаёт порядок строк и подписывает группы (ADR-094)', () => {
    renderCompare({ compare: 'split-07,split-12' });

    expect(screen.getAllByRole('columnheader', { name: 'Основное' }).length).toBeGreaterThan(0);
  });

  it('прокручивается внутри своего контейнера, а не растягивает страницу', () => {
    renderCompare({ compare: 'split-07,split-12' });

    const region = screen.getByRole('region', { name: /прокручивается по горизонтали/i });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(screen.getByRole('table'));
  });

  it('отмечены все — таблица со всеми колонками', () => {
    renderCompare({ compare: catalog.map((product) => product.slug).join(',') });

    expect(columnHeaders()).toHaveLength(catalog.length + 1);
  });
});

describe('Сравнение — управление отметками', () => {
  it('🔴 снятие отметки остаётся на странице сравнения, а не уводит в каталог', () => {
    renderCompare({ compare: 'split-07,split-12' });

    expect(hrefOf(compareChipLabel('Сплит-система 07'))).toBe('/compare?compare=split-12');
  });

  it('🔴 возврат в каталог несёт с собой и подбор, и отметки', () => {
    renderCompare({ class: '07', sort: 'price-asc', compare: 'split-07,split-12' });

    expect(hrefOf(t.compareBack)).toBe(
      '/catalog?class=07&sort=price-asc&compare=split-07%2Csplit-12',
    );
  });

  it('очистка ведёт в каталог без отметок: на пустой странице делать нечего', () => {
    renderCompare({ class: '07', compare: 'split-07,split-12' });

    expect(hrefOf(t.compareClearFull)).toBe('/catalog?class=07');
  });

  it('🔴 незнакомый слаг молча выпадает и не тащится дальше по ссылкам', () => {
    renderCompare({ compare: 'нет-такой,split-07' });

    expect(hrefOf(t.compareBack)).toBe('/catalog?compare=split-07');
  });

  it('🔴 при нескольких моделях кнопка несёт только тему: выбирать за человека нельзя', () => {
    renderCompare({ compare: 'split-07,split-12' });

    expect(hrefOf(productPageText.order)).toBe('/?topic=install#lead');
  });

  it('🔴 отмечена ровно одна модель — её слаг уезжает с кнопкой (ADR-129)', () => {
    renderCompare({ compare: 'split-07' });

    expect(hrefOf(productPageText.order)).toBe('/?model=split-07&topic=install#lead');
  });
});

describe('Сравнение — вырожденные состояния (ADR-120)', () => {
  it('🔴 ничего не отмечено — приглашение и дорога в каталог, а не пустая страница', () => {
    renderCompare();

    expect(screen.getByText(t.compareEmptyTitle)).toBeInTheDocument();
    expect(screen.getByText(t.compareHint)).toBeInTheDocument();
    expect(hrefOf(t.compareToCatalog)).toBe('/catalog');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('🔴 все слаги мусорные — то же приглашение: адрес правят руками', () => {
    renderCompare({ compare: 'нет-такой,и-этой-нет' });

    expect(screen.getByText(t.compareEmptyTitle)).toBeInTheDocument();
  });

  it('🔴 отмечена одна — выбор виден, но таблицы нет: сравнивать не с чем', () => {
    renderCompare({ compare: 'split-07' });

    expect(screen.getByText(t.compareAlone)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: t.compareChosen })).getByRole('link', {
        name: compareChipLabel('Сплит-система 07'),
      }),
    ).toHaveAttribute('href', '/compare');
  });

  it('у отмеченных моделей нет характеристик — остаётся цена и честная сноска', () => {
    const bare: readonly CatalogProduct[] = catalog.map((product) => ({ ...product, specs: [] }));
    renderCompare({ compare: 'split-07,split-09' }, bare);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: catalogText.comparePrice })).toBeInTheDocument();
    expect(screen.getByText(catalogText.compareNoSpecs)).toBeInTheDocument();
  });
});

/**
 * 🔴 Устройство прокрутки держат правила CSS, а jsdom их не применяет.
 * Проверяем источник; поведение в браузере снято замером (issue #263).
 */
describe('Сравнение — прокрутка внутри контейнера (issue #263)', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const tableCss = readFileSync(join(here, 'ui', 'CompareTable.module.css'), 'utf8');
  const kitCss = readFileSync(
    join(here, '..', '..', 'shared', 'ui', 'Table', 'Table.module.css'),
    'utf8',
  );
  /* Комментарии выброшены: они объясняют в том числе отвергнутые варианты, и
     проверка «такого правила в файле нет» ловила бы упоминание, а не правило. */
  const kitRules = kitCss.replace(/\/\*[\s\S]*?\*\//g, '');

  it('🔴 первая колонка залипает и отделена тенью, а не границей', () => {
    /* При `border-collapse: collapse` граница залипшей ячейки принадлежит
       сетке таблицы и уезжает вместе с ней. */
    expect(kitCss).toMatch(/\.sticky th:first-child[\s\S]*?position:\s*sticky/);
    expect(tableCss).toMatch(/box-shadow:\s*1px 0 0 var\(--line\)/);
    expect(tableCss).toMatch(/border-right:\s*0/);
  });

  it('🔴 залипшая ячейка берёт фон своей строки — иначе она просвечивает', () => {
    expect(kitCss).toMatch(/\.sticky th:first-child[\s\S]*?background:\s*inherit/);
    expect(kitCss).toMatch(/\.zebra tbody tr:nth-child\(even\)\s*\{[^}]*background:\s*var\(--stripe-a\)/);
  });

  it('названия характеристик переносятся, значения — нет', () => {
    expect(tableCss).toMatch(/overflow-wrap:\s*anywhere/);
    expect(tableCss).toMatch(/white-space:\s*nowrap/);
    expect(tableCss).toMatch(/width:\s*clamp\(132px/);
  });

  it('🔴 затухание края статично, а не привязано к прокрутке', () => {
    /* Вариант со шкалой прокрутки гасил бы полоску там, где прокручивать
       нечего, но оказался недетерминированным: снимок расходился с эталоном
       на 96–100% пикселей, каждый раз на разном наборе историй тёмной темы
       (ADR-197). Прокруточной шкале здесь не место — проверяем, что её нет. */
    expect(kitCss).toMatch(/\.faded\s*\{[^}]*mask-image:\s*linear-gradient/);
    expect(kitRules).not.toMatch(/animation-timeline/);
  });
});
