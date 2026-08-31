import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
import {
  activeFilterChipLabel,
  catalogListText as t,
  catalogText,
  compareMarkLabel,
} from './content';
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
      compared={selectCatalogCompare(products, query.compare).map((product) => product.slug)}
      basePath="/catalog"
      comparePath="/compare"
      productHref={productHrefFixture}
      orderHref="/#lead"
      now={NOW}
    />,
  );
}

/**
 * Карточки выдачи. Считаются по заголовкам моделей, а не по `listitem`:
 * чипы выбранного — тоже элементы списка, и общий счёт смешал бы их с
 * товаром.
 */
function cards(): readonly string[] {
  return screen.queryAllByRole('heading', { level: 3 }).map((heading) => heading.textContent ?? '');
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

  it('🔴 подбор сворачивается родным <details>, а не состоянием на клиенте (ADR-121)', () => {
    const { container } = renderList();

    const box = container.querySelector('details');
    expect(box).not.toBeNull();
    // содержимое всегда в HTML, как у FAQ: свёрнуто — не значит «нет»
    expect(within(box as HTMLElement).getByRole('link', { name: '09' })).toBeInTheDocument();
    expect(box?.hasAttribute('open')).toBe(false);
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

describe('Каталог — выбранное видно всегда (ADR-121)', () => {
  it('🔴 чипы показывают выбранное: свёрнутый подбор не прячет, чем сужена выдача', () => {
    renderList(catalog, { class: '09', area: '25', sale: '1' });

    const chosen = within(screen.getByRole('list', { name: t.activeTitle }));
    expect(
      chosen.getAllByRole('listitem').map((item) => item.textContent?.replace('×', '').trim()),
    ).toEqual(['Класс 09', 'Площадь 25 м²', t.filterSaleOn]);
  });

  it('🔴 чип снимает свой параметр и не трогает соседние', () => {
    renderList(catalog, { class: '09', area: '25' });

    expect(hrefOf(activeFilterChipLabel('Класс 09'))).toBe('/catalog?area=25');
    expect(hrefOf(activeFilterChipLabel('Площадь 25 м²'))).toBe('/catalog?class=09');
  });

  it('чип называет и параметр, и значение: «09» в отрыве от группы не читается', () => {
    renderList(catalog, { class: '09' });

    const chip = screen.getByRole('link', { name: activeFilterChipLabel('Класс 09') });
    expect(chip).toHaveTextContent('Класс 09');
    expect(chip).toHaveAccessibleName(expect.stringContaining(t.activeRemove));
  });

  it('чипы не забирают с собой отметки сравнения', () => {
    renderList(catalog, { class: '09', compare: 'split-07' });

    expect(hrefOf(activeFilterChipLabel('Класс 09'))).toBe('/catalog?compare=split-07');
  });

  it('ничего не выбрано — чипов нет', () => {
    renderList();

    expect(screen.queryByRole('list', { name: t.activeTitle })).not.toBeInTheDocument();
  });

  it('порядок не считается подбором: свой переключатель у него уже есть', () => {
    renderList(catalog, { sort: 'price-asc' });

    expect(screen.queryByRole('list', { name: t.activeTitle })).not.toBeInTheDocument();
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
    expect(cards()).toEqual(['Сплит-система 09']);
  });

  it('карточка ведёт на страницу модели', () => {
    renderList([plainProduct]);

    expect(hrefOf('Сплит-система 07')).toBe('/catalog/split-07');
  });

  it('пустая выдача объясняет, что делать, и оставляет путь к заявке', () => {
    renderList(catalog, { class: '09', area: '70' });

    expect(screen.getByText(t.nothingTitle)).toBeInTheDocument();
    expect(cards()).toEqual([]);
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

    expect(cards()).toHaveLength(CATALOG_PAGE_SIZE);
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

describe('Каталог — строка сравнения (ADR-121)', () => {
  it('🔴 отметка — ссылка, добавляющая слаг в адрес, а не состояние на клиенте', () => {
    renderList();

    expect(hrefOf(compareMarkLabel('Сплит-система 07', false))).toBe(
      '/catalog?compare=split-07#compare',
    );
  });

  it('🔴 отметка ничего не разворачивает: таблицы в каталоге нет вовсе', () => {
    renderList(catalog, { compare: 'split-07,split-12' });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('🔴 строка называет число отмеченного и уводит на страницу сравнения', () => {
    renderList(catalog, { compare: 'split-07,split-12' });

    expect(screen.getByText(t.compareCount(2))).toBeInTheDocument();
    expect(hrefOf(t.compareOpen)).toBe('/compare?compare=split-07%2Csplit-12');
  });

  it('🔴 переход к сравнению несёт с собой подбор: возврат откроет ту же выдачу', () => {
    renderList(catalog, { class: '07', sort: 'price-asc', compare: 'split-07' });

    expect(hrefOf(t.compareOpen)).toBe('/compare?class=07&sort=price-asc&compare=split-07');
  });

  it('очистка снимает отметки, оставляя подбор на месте', () => {
    renderList(catalog, { class: '09', compare: 'split-09' });

    expect(hrefOf(t.compareClearFull)).toBe('/catalog?class=09');
  });

  it('ничего не отмечено — строки нет: пустой счётчик над витриной это шум', () => {
    renderList();

    expect(screen.queryByRole('link', { name: t.compareOpen })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t.compareClearFull })).not.toBeInTheDocument();
  });

  it('🔴 повторное нажатие убирает слаг: подпись и адрес меняются вместе', () => {
    renderList(catalog, { compare: 'split-07,split-12' });

    const mark = screen.getByRole('link', { name: compareMarkLabel('Сплит-система 07', true) });
    expect(mark).toHaveAttribute('href', '/catalog?compare=split-12#compare');
    expect(mark).toHaveAttribute('aria-current', 'true');
  });

  it('🔴 у отметки-иконки состояние читается именем, а не одним цветом', () => {
    renderList(catalog, { compare: 'split-07' });

    /* Подписи у отметки больше нет: она кнопка-иконка в углу снимка
       (issue #259). Значит имя обязано нести всё — и модель, и то, что
       повторное нажатие снимет отметку. */
    const picked = screen.getByRole('link', { name: compareMarkLabel('Сплит-система 07', true) });
    expect(picked).toHaveAccessibleName(expect.stringContaining(catalogText.compareOn));
    expect(picked).toHaveAccessibleName(expect.stringContaining(catalogText.compareRemove));
    expect(picked).toHaveAttribute('aria-current', 'true');

    const free = screen.getByRole('link', { name: compareMarkLabel('Сплит-система 09', false) });
    expect(free).toHaveAccessibleName(expect.stringContaining(catalogText.compareAdd));
    expect(free).not.toHaveAttribute('aria-current');
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

  it('🔴 незнакомый слаг молча выпадает и не тащится дальше по ссылкам', () => {
    renderList(catalog, { compare: 'нет-такой,split-07' });

    expect(screen.getByText(t.compareCount(1))).toBeInTheDocument();
    expect(hrefOf('09')).toBe('/catalog?class=09&compare=split-07');
  });
});

/**
 * 🔴 Лента фильтров: её признаки — это правила CSS, и jsdom их не применяет.
 * Проверяем источник; поведение в браузере снято замером (issue #261).
 */
describe('Подбор — лента фильтров (issue #261)', () => {
  const css = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'ui', 'CatalogFilters.module.css'),
    'utf8',
  );

  const ribbon = css.slice(css.indexOf('@media (width < 900px)'));

  it('🔴 ниже 900 у ленты есть поля, затухание и снап', () => {
    expect(ribbon).toMatch(/flex-wrap:\s*nowrap/);
    expect(ribbon).toMatch(/overflow-x:\s*auto/);
    expect(ribbon).toMatch(/scroll-snap-type:\s*x proximity/);
    expect(ribbon).toMatch(/mask-image:\s*var\(--fade-inline-end\)/);
    // поля: лента выходит за поле панели и возвращает отступ содержимому
    expect(ribbon).toMatch(/margin-inline:\s*-16px/);
    expect(ribbon).toMatch(/padding-inline:\s*16px/);
  });

  it('🔴 место под кольцо фокуса зарезервировано по вертикали', () => {
    /* `overflow-x: auto` обрезает по обеим осям, и внешняя тень кольца у чипа
       срезалась бы сверху и снизу. */
    expect(ribbon).toMatch(/padding-block:\s*5px/);
    expect(ribbon).toMatch(/margin-block:\s*-5px/);
  });

  it('с 900 ленты нет — чипы переносятся по строкам', () => {
    const base = css.slice(0, css.indexOf('@media (width < 900px)'));
    expect(base).toMatch(/\.values\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(base).not.toMatch(/\.values\s*\{[^}]*overflow-x/);
  });
});
