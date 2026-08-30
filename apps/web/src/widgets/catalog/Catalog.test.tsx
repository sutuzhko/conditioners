import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Catalog, type CatalogProps } from './Catalog';
import { catalogText } from './content';
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
const priceCss = readFileSync(join(HERE, 'ui', 'ProductPrice.module.css'), 'utf8');
const tokensCss = readFileSync(join(HERE, '..', '..', 'shared', 'styles', 'tokens.css'), 'utf8');

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
