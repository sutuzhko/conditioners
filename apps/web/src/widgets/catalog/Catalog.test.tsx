import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Catalog, type CatalogProps } from './Catalog';
import {
  catalogFixture,
  discountedProduct,
  expiredSaleProduct,
  hiddenProduct,
  labelledSaleProduct,
  NOW,
  plainProduct,
  productHrefFixture,
  specDictionaryFixture,
  uniqueSpecProduct,
} from './fixtures';

/** Витрина всегда знает адрес модели — в тестах он один на все истории. */
function renderCatalog(props: Omit<CatalogProps, 'productHref'>) {
  return render(<Catalog {...props} productHref={productHrefFixture} />);
}

/** Строка таблицы по названию характеристики: заголовок строки + её ячейки. */
function specRow(name: string): readonly string[] {
  const header = screen.getByRole('rowheader', { name });
  const row = header.closest('tr');
  if (row === null) throw new Error(`Строка «${name}» не найдена`);
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '');
}

describe('Каталог — таблица сравнения', () => {
  it('строится как объединение характеристик всех видимых моделей', () => {
    renderCatalog({ products: [plainProduct, uniqueSpecProduct], now: NOW });

    // «Wi-Fi управление» есть только у одной модели — строка обязана появиться
    for (const key of ['Компрессор', 'Уровень шума', 'Обогрев до', 'Wi-Fi управление']) {
      expect(screen.getByRole('rowheader', { name: key })).toBeInTheDocument();
    }
  });

  it('ставит прочерк там, где характеристика у модели не указана', () => {
    renderCatalog({ products: [plainProduct, uniqueSpecProduct], now: NOW });

    expect(specRow('Wi-Fi управление')).toEqual(['—', 'Есть']);
    expect(specRow('Обогрев до')).toEqual(['−15 °C', '—']);
  });

  it('колонки идут в порядке моделей и подписаны их названиями', () => {
    renderCatalog({ products: [plainProduct, uniqueSpecProduct], now: NOW });

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['Характеристика', 'Сплит-система 07', 'Сплит-система 12']);
  });

  it('скрытая модель не попадает ни в витрину, ни в сравнение', () => {
    renderCatalog({ products: [plainProduct, hiddenProduct], now: NOW });

    expect(screen.queryByRole('heading', { name: 'Снятая с продажи' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('rowheader', { name: 'Секретная характеристика' }),
    ).not.toBeInTheDocument();
  });

  it('прокручивается внутри своего контейнера, а не растягивает страницу', () => {
    renderCatalog({ products: catalogFixture, now: NOW });

    const region = screen.getByRole('region', { name: /прокручивается по горизонтали/i });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(screen.getByRole('table'));
  });

  it('замыкается ценой под ключ — той же, что на карточке', () => {
    renderCatalog({ products: [plainProduct, discountedProduct], now: NOW });

    const row = screen.getByRole('rowheader', { name: 'Цена под ключ' }).closest('tr');
    if (row === null) throw new Error('Строка цены не найдена');

    expect(within(row).getByText('34 900 ₽')).toBeInTheDocument();
    // у модели со скидкой в сравнении стоит действующая цена, а не перечёркнутая
    expect(within(row).getByText('33 900 ₽')).toBeInTheDocument();
    expect(within(row).queryByText('38 500 ₽')).not.toBeInTheDocument();
  });

  it('справочник задаёт порядок строк сравнения и подписывает группы', () => {
    renderCatalog({
      products: [plainProduct, uniqueSpecProduct],
      now: NOW,
      specDictionary: specDictionaryFixture,
    });

    const groupHeader = screen.getAllByRole('columnheader', { name: 'Основное' });
    expect(groupHeader.length).toBeGreaterThan(0);
  });

  it('без характеристик таблицы нет — сравнивать нечего', () => {
    renderCatalog({ products: [{ ...plainProduct, specs: [] }], now: NOW });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Сплит-система 07' })).toBeInTheDocument();
  });
});

describe('Каталог — скидка', () => {
  it('показывает действующую цену, зачёркнутую старую и вычисленный процент', () => {
    renderCatalog({ products: [discountedProduct], now: NOW });

    // цену ищем внутри карточки: та же сумма стоит и в строке сравнения
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
  it('модель без фото получает заглушку с классом мощности, а не битую картинку', () => {
    renderCatalog({ products: [plainProduct], now: NOW });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Класс мощности 07')).toBeInTheDocument();
  });

  it('фотография подписана осмысленным alt с географией', () => {
    renderCatalog({ products: [discountedProduct], now: NOW });

    expect(
      screen.getByAltText('Сплит-система 09 — купить в Туле с установкой'),
    ).toBeInTheDocument();
  });

  it('кнопка заказа ведёт на форму заявки', () => {
    renderCatalog({ products: [plainProduct], now: NOW, orderHref: '#lead' });

    expect(screen.getByRole('link', { name: 'Заказать' })).toHaveAttribute('href', '#lead');
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

  it('ссылка к поставщику внешняя и не передаёт ему вес', () => {
    renderCatalog({ products: [uniqueSpecProduct], now: NOW });

    const link = screen.getByRole('link', { name: /Страница модели у поставщика/ });
    expect(link).toHaveAttribute('href', 'https://example.com/split-12');
    expect(link).toHaveAttribute('rel', expect.stringContaining('nofollow'));
  });
});

describe('Каталог — витрина и ассортимент', () => {
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

  it('на время загрузки показывает скелетоны вместо прыгающей вёрстки', () => {
    const { container } = renderCatalog({ products: [], loading: true });

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Каталог пока пуст')).not.toBeInTheDocument();
  });
});
