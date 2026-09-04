import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Catalog, type CatalogProps } from './Catalog';
import { catalogText } from './content';
import { SHOWCASE_MAX_SHOWN, SHOWCASE_MIN_SHOWN, SHOWCASE_STEPS } from './model';
import {
  catalogFixture,
  discountedProduct,
  expiredSaleProduct,
  hiddenProduct,
  labelledSaleProduct,
  NOW,
  plainProduct,
  productHrefFixture,
  uniqueSpecProduct,
} from './fixtures';

/**
 * 🔴 Общую линию цены и кнопки держат правила CSS, а jsdom их не применяет
 * (тот же приём, что в HeroPicker.test: тест, который не может упасть, хуже
 * отсутствующего). Проверяем источник правил.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const cardCss = readFileSync(join(HERE, 'ui', 'ProductCard.module.css'), 'utf8');
const gridCss = readFileSync(join(HERE, 'ui', 'grid.module.css'), 'utf8');
const showcaseCss = readFileSync(join(HERE, 'ui', 'ShowcaseGrid.module.css'), 'utf8');
const priceCss = readFileSync(join(HERE, 'ui', 'ProductPrice.module.css'), 'utf8');
const tokensCss = readFileSync(join(HERE, '..', '..', 'shared', 'styles', 'tokens.css'), 'utf8');

/**
 * Блок правил вместе с условием, при котором он действует.
 *
 * 🔴 Заведён под issue #552: вся правка витрины живёт в медиазапросах, а
 * jsdom их не применяет. Регулярка «в файле где-то есть такая строка» на
 * этот вопрос не отвечает — спрашивать надо не «есть ли правило», а «какое
 * из них действует на этой ширине». Поэтому файл разбирается на блоки, и
 * тест спрашивает ширину так же, как спросил бы браузер.
 */
type StyleBlock = {
  readonly applies: (width: number) => boolean;
  readonly body: string;
};

/** Условие медиазапроса → предикат по ширине. Разобраны те формы, что в файлах. */
function widthCondition(condition: string): (width: number) => boolean {
  const range = /\((\d+)px\s*<=\s*width\s*<\s*(\d+)px\)/.exec(condition);
  if (range !== null) {
    const from = Number(range[1]);
    const to = Number(range[2]);
    return (width) => width >= from && width < to;
  }

  const edges = [...condition.matchAll(/\(width\s*(>=|<)\s*(\d+)px\)/g)].map((edge) => {
    const value = Number(edge[2]);
    return edge[1] === '>=' ? (width: number) => width >= value : (width: number) => width < value;
  });

  // запятая в медиазапросе — «или»; других сочетаний в этих файлах нет
  return (width) => edges.some((matches) => matches(width));
}

function styleBlocks(css: string): readonly StyleBlock[] {
  const media = [...css.matchAll(/@media([^{]+)\{((?:[^{}]|\{[^{}]*\})*)\}/g)];
  const outside = media.reduce((rest, block) => rest.replace(block[0], ''), css);

  return [
    { applies: () => true, body: outside },
    ...media.map((block) => ({
      applies: widthCondition(block[1] ?? ''),
      body: block[2] ?? '',
    })),
  ];
}

/**
 * Что победило на этой ширине: у правил одинаковая специфичность, значит
 * решает порядок — как в браузере, побеждает последнее.
 */
function winnerAt(css: string, width: number, pattern: RegExp): string | null {
  let winner: string | null = null;

  for (const block of styleBlocks(css)) {
    if (!block.applies(width)) continue;
    for (const hit of block.body.matchAll(pattern)) winner = hit[1] ?? null;
  }

  return winner;
}

/** Колонок в сетке на этой ширине. */
const columnsAt = (width: number): string | null =>
  winnerAt(gridCss, width, /repeat\((\d+),\s*minmax\(0,\s*1fr\)\)/g);

/** С какой по счёту карточки витрина гасит остальные. */
const clipFromAt = (width: number): string | null =>
  winnerAt(gridCss, width, /\.clipped > li:nth-child\(n \+ (\d+)\)/g);

/** Убран ли ряд с кнопкой раскрытия у витрины ровно на предел. */
const revealRowHiddenAt = (width: number): boolean =>
  winnerAt(showcaseCss, width, /(\.row\[data-reveal='min-shown'\])[^}]*display:\s*none/g) !== null;

/** Витрина всегда знает адрес модели — в тестах он один на все истории. */
function renderCatalog(props: Omit<CatalogProps, 'productHref'>) {
  return render(<Catalog {...props} productHref={productHrefFixture} />);
}

describe('Витрина — сравнение', () => {
  it('🔴 таблицы сравнения на витрине больше нет: сравнивают по выбору (ADR-109)', () => {
    renderCatalog({ products: [plainProduct, uniqueSpecProduct], now: NOW });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: 'Компрессор' })).not.toBeInTheDocument();
  });

  it('🔴 отметка уводит в каталог с уже отмеченной моделью', () => {
    renderCatalog({
      products: [plainProduct],
      now: NOW,
      compareHref: (slug) => ({ pathname: '/catalog', query: { compare: slug }, hash: 'compare' }),
    });

    expect(screen.getByRole('link', { name: /Сравнить: Сплит-система 07/ })).toHaveAttribute(
      'href',
      '/catalog?compare=split-07#compare',
    );
  });

  it('без адреса сравнения отметки на карточке нет — мёртвых ссылок блок не рисует', () => {
    renderCatalog({ products: [plainProduct], now: NOW });

    expect(screen.queryByRole('link', { name: /Сравнить/ })).not.toBeInTheDocument();
  });
});

describe('Каталог — скидка', () => {
  it('показывает действующую цену, зачёркнутую старую и вычисленный процент', () => {
    renderCatalog({ products: [discountedProduct], now: NOW });

    const card = within(screen.getByRole('listitem'));
    expect(card.getByText('33 900 ₽')).toBeInTheDocument();

    const old = card.getByText(/38 500 ₽/);
    expect(old.closest('s')).not.toBeNull();

    // 1 − 33 900 / 38 500 = 11,9% → −12%
    expect(screen.getByText('−12%')).toBeInTheDocument();
  });

  it('показывает срок действия микроподписью, когда он задан', () => {
    renderCatalog({ products: [discountedProduct], now: NOW });

    expect(screen.getByText('до 31 октября 2026')).toBeInTheDocument();
  });

  it('вместо процента печатает подпись владельца, а срока без даты не выдумывает', () => {
    renderCatalog({ products: [labelledSaleProduct], now: NOW });

    expect(screen.getByText('Последняя в наличии')).toBeInTheDocument();
    // срок — это дата; «до 50 м²» рядом — площадь, её ловить нельзя
    expect(screen.queryByText(/^до \d+ [а-яё]+ \d{4}$/)).not.toBeInTheDocument();
  });

  it('товар без скидки рисуется без плашки и без перечёркнутой цены', () => {
    renderCatalog({ products: [plainProduct], now: NOW });

    expect(within(screen.getByRole('listitem')).getByText('34 900 ₽')).toBeInTheDocument();
    expect(document.querySelector('s')).toBeNull();
    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();
  });

  it('закончившаяся скидка не оставляет следов на карточке', () => {
    renderCatalog({ products: [expiredSaleProduct], now: NOW });

    expect(within(screen.getByRole('listitem')).getByText('74 500 ₽')).toBeInTheDocument();
    expect(screen.queryByText('69 900 ₽')).not.toBeInTheDocument();
    expect(document.querySelector('s')).toBeNull();
  });
});

describe('Каталог — карточка', () => {
  it('модель без фото получает заглушку, а не битую картинку', () => {
    renderCatalog({ products: [plainProduct], now: NOW });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(catalogText.noPhoto)).toBeInTheDocument();
  });

  it('🔴 класс мощности читается вслух расшифровкой и со снимком, и без него', () => {
    renderCatalog({ products: [plainProduct, discountedProduct], now: NOW });

    expect(screen.getByText('Класс мощности 07')).toBeInTheDocument();
    expect(screen.getByText('Класс мощности 09')).toBeInTheDocument();
  });

  it('фотография подписана осмысленным alt с географией', () => {
    renderCatalog({ products: [discountedProduct], now: NOW });

    expect(
      screen.getByAltText('Сплит-система 09 — купить в Туле с установкой'),
    ).toBeInTheDocument();
  });

  it('🔴 кнопка заказа несёт к форме слаг своей модели и тему (ADR-129)', () => {
    renderCatalog({ products: [plainProduct], now: NOW });

    expect(screen.getByRole('link', { name: 'Заказать' })).toHaveAttribute(
      'href',
      '/?model=split-07&topic=install#lead',
    );
  });

  it('🔴 у каждой карточки свой предмет: две модели — два разных адреса', () => {
    renderCatalog({ products: [plainProduct, discountedProduct], now: NOW });

    expect(
      screen.getAllByRole('link', { name: 'Заказать' }).map((link) => link.getAttribute('href')),
    ).toEqual(['/?model=split-07&topic=install#lead', '/?model=split-09&topic=install#lead']);
  });

  it('🔴 название модели — ссылка на её страницу, а не текст (ADR-109)', () => {
    renderCatalog({ products: [plainProduct], now: NOW });

    const link = screen.getByRole('link', { name: 'Сплит-система 07' });
    expect(link).toHaveAttribute('href', '/catalog/split-07');
    expect(link.closest('h3')).not.toBeNull();
  });

  it('🔴 полных характеристик в карточке больше нет — они на странице модели', () => {
    renderCatalog({ products: [plainProduct], now: NOW });

    const card = screen.getByRole('listitem');
    expect(within(card).queryByText('Уровень шума')).not.toBeInTheDocument();
    expect(card.querySelector('details')).toBeNull();
  });

  it('🔴 явное действие в карточке ровно одно — «Заказать» (issue #259)', () => {
    renderCatalog({ products: [uniqueSpecProduct], now: NOW });

    const card = screen.getByRole('listitem');
    /* Ссылок в карточке две — название модели и кнопка заказа. Подсказки
       «Подробнее» на тот же адрес больше нет: она дублировала заголовок
       вторым пунктом в списке ссылок скринридера. Ссылка к поставщику ушла
       на страницу модели — там её проверяет ProductDetails.test. */
    expect(within(card).getAllByRole('link')).toHaveLength(2);
    expect(
      within(card).queryByRole('link', { name: /Страница модели у поставщика/ }),
    ).not.toBeInTheDocument();
    expect(within(card).queryByText(/Подробнее/)).not.toBeInTheDocument();
  });
});

describe('Каталог — витрина и ассортимент', () => {
  it('скрытая модель на витрину не попадает', () => {
    renderCatalog({ products: [plainProduct, hiddenProduct], now: NOW });

    expect(screen.queryByRole('heading', { name: 'Снятая с продажи' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('ведёт во весь каталог, когда страница дала адрес', () => {
    renderCatalog({ products: catalogFixture, now: NOW, catalogHref: '/catalog' });

    expect(screen.getByRole('link', { name: /Весь каталог/ })).toHaveAttribute('href', '/catalog');
  });

  it('без адреса каталога ссылки нет — мёртвых ссылок блок не рисует', () => {
    renderCatalog({ products: catalogFixture, now: NOW });

    expect(screen.queryByRole('link', { name: /Весь каталог/ })).not.toBeInTheDocument();
  });
});

describe('Каталог — пустые состояния', () => {
  it('пустой каталог не ломает вёрстку: заголовок на месте, таблицы нет', () => {
    renderCatalog({ products: [] });

    expect(
      screen.getByRole('heading', { level: 2, name: 'Купить кондиционер в Туле' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Каталог пока пуст')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});

describe('Карточка — общая базовая линия цены и действия (issue #182, #259)', () => {
  it('🔴 слот под ярлык скидки есть и у модели без скидки', () => {
    renderCatalog({ products: [plainProduct, discountedProduct], now: NOW });

    /* Блок цены рисует ровно два абзаца — строку цены и слот, — и делает это
       одинаково в обоих состояниях. Разное число абзацев и означало бы, что
       у карточки без скидки слота нет, а кнопка соседа поехала. */
    const paragraphs = screen
      .getAllByRole('listitem')
      .map((card) => card.querySelectorAll('p').length);

    expect(paragraphs).toEqual([2, 2]);
  });

  it('🔴 слот постоянной высоты и обрезает, а не переносит', () => {
    expect(tokensCss).toMatch(/--sale-slot-h:\s*24px/);
    expect(priceCss).toMatch(/\.slot\s*\{[^}]*height:\s*var\(--sale-slot-h\)/);
    expect(priceCss).toMatch(/\.slot\s*\{[^}]*overflow:\s*hidden/);
  });

  it('🔴 действие прижато к низу карточки, а снимок держит своё место', () => {
    expect(cardCss).toMatch(/\.actions\s*\{[^}]*margin-top:\s*auto/);
    expect(cardCss).toMatch(/\.media\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10/);
  });

  it('🔴 тап-зона отметки сравнения — не меньше 44×44', () => {
    expect(cardCss).toMatch(/\.compare\s*\{[^}]*width:\s*var\(--tap\)/);
    expect(cardCss).toMatch(/\.compare\s*\{[^}]*height:\s*var\(--tap\)/);
  });

  it('процент скидки вычисляется из цен, а не берётся из данных', () => {
    renderCatalog({ products: [discountedProduct], now: NOW });

    // 38 500 → 33 900 даёт ровно −12%: ни в фикстуре, ни в коде этого числа нет
    expect(screen.getByText('−12%')).toBeInTheDocument();
  });

  it('🔴 у модели без скидки нет ни перечёркнутой цены, ни плашки', () => {
    renderCatalog({ products: [plainProduct], now: NOW });

    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();
    expect(screen.getByRole('listitem').querySelector('s')).toBeNull();
    expect(screen.getByText('под ключ')).toBeInTheDocument();
  });
});

describe('Витрина — сетка и раскрытие остальных моделей (issue #260, issue #552)', () => {
  /** Витрина из шести моделей: часть показывается, остальные ждут раскрытия. */
  const six = [
    plainProduct,
    discountedProduct,
    uniqueSpecProduct,
    labelledSaleProduct,
    { ...plainProduct, id: 'split-24', slug: 'split-24', name: 'Сплит-система 24' },
    { ...plainProduct, id: 'split-30', slug: 'split-30', name: 'Сплит-система 30' },
  ];

  it('🔴 все модели лежат в HTML сразу, а не догружаются нажатием (инвариант 1)', () => {
    renderCatalog({ products: six, now: NOW });

    expect(screen.getAllByRole('listitem')).toHaveLength(six.length);
    expect(screen.getByRole('heading', { name: 'Сплит-система 30' })).toBeInTheDocument();
  });

  it('🔴 кнопка называет весь список, а не остаток: остаток зависел бы от ширины', () => {
    renderCatalog({ products: six, now: NOW });

    const more = screen.getByRole('button', { name: catalogText.showAll(six.length) });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).toHaveAttribute('aria-controls', 'showcase-models');
    expect(more.parentElement).toHaveAttribute('data-reveal', 'always');
  });

  it('витрине короче самого скупого диапазона раскрывать нечем — кнопки нет', () => {
    renderCatalog({ products: six.slice(0, SHOWCASE_MIN_SHOWN), now: NOW });

    expect(screen.queryByRole('button', { name: /Показать все/ })).not.toBeInTheDocument();
  });

  it('🔴 витрина ровно на предел носит кнопку только там, где показано меньше всего', () => {
    renderCatalog({ products: six.slice(0, SHOWCASE_MAX_SHOWN), now: NOW });

    /* Кнопка приезжает от сервера всегда — ширины он не знает (инвариант 1),
       — а убирает её оттуда, где показаны уже все карточки, стиль. */
    const more = screen.getByRole('button', { name: catalogText.showAll(SHOWCASE_MAX_SHOWN) });
    expect(more.parentElement).toHaveAttribute('data-reveal', 'min-shown');

    /* Скупых диапазонов два: телефон в одну колонку и планшет в три. Там
       кнопка обязана быть видна, в остальных — погашена стилем. */
    expect(SHOWCASE_STEPS.filter((step) => step.shown === SHOWCASE_MIN_SHOWN)).toEqual([
      { from: 0, columns: 1, shown: 3 },
      { from: 900, columns: 3, shown: 3 },
    ]);
    for (const width of [600, 899, 1200, 1440]) {
      expect(revealRowHiddenAt(width), `ширина ${width}`).toBe(true);
    }
    for (const width of [320, 599, 900, 1199]) {
      expect(revealRowHiddenAt(width), `ширина ${width}`).toBe(false);
    }
  });

  it('🔴 стиль сходится с таблицей порогов, и пустых ячеек в последнем ряду нет', () => {
    /* `nth-child` не умеет читать переменную, а число колонок принадлежит
       сетке, одной на витрину и на страницу каталога. Свести таблицу со
       стилем может только тест — и он же держит главное правило: показанное
       делится на число колонок нацело. */
    expect(SHOWCASE_STEPS.map((step) => step.from)).toEqual([0, 600, 900, 1200]);

    for (const [index, step] of SHOWCASE_STEPS.entries()) {
      expect(step.shown % step.columns, `ряд с ${step.from}`).toBe(0);

      const above = SHOWCASE_STEPS[index + 1];
      for (const width of [step.from === 0 ? 320 : step.from, (above?.from ?? 1441) - 1]) {
        expect(columnsAt(width), `колонок на ${width}`).toBe(String(step.columns));
        expect(clipFromAt(width), `гашение на ${width}`).toBe(String(step.shown + 1));
      }
    }

    expect(gridCss).toMatch(/display:\s*none/);
  });
});
