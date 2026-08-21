import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Catalog } from './Catalog';
import {
  catalogFixture,
  discountedProduct,
  expiredSaleProduct,
  hiddenProduct,
  labelledSaleProduct,
  NOW,
  plainProduct,
  uniqueSpecProduct,
} from './fixtures';

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
    render(<Catalog products={[plainProduct, uniqueSpecProduct]} now={NOW} />);

    // «Wi-Fi управление» есть только у одной модели — строка обязана появиться
    for (const key of ['Компрессор', 'Уровень шума', 'Обогрев до', 'Wi-Fi управление']) {
      expect(screen.getByRole('rowheader', { name: key })).toBeInTheDocument();
    }
  });

  it('ставит прочерк там, где характеристика у модели не указана', () => {
    render(<Catalog products={[plainProduct, uniqueSpecProduct]} now={NOW} />);

    expect(specRow('Wi-Fi управление')).toEqual(['—', 'Есть']);
    expect(specRow('Обогрев до')).toEqual(['−15 °C', '—']);
  });

  it('колонки идут в порядке моделей и подписаны их названиями', () => {
    render(<Catalog products={[plainProduct, uniqueSpecProduct]} now={NOW} />);

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['Характеристика', 'Сплит-система 07', 'Сплит-система 12']);
  });

  it('скрытая модель не попадает ни в витрину, ни в сравнение', () => {
    render(<Catalog products={[plainProduct, hiddenProduct]} now={NOW} />);

    expect(screen.queryByRole('heading', { name: 'Снятая с продажи' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('rowheader', { name: 'Секретная характеристика' }),
    ).not.toBeInTheDocument();
  });

  it('прокручивается внутри своего контейнера, а не растягивает страницу', () => {
    render(<Catalog products={catalogFixture} now={NOW} />);

    const region = screen.getByRole('region', { name: /прокручивается по горизонтали/i });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(screen.getByRole('table'));
  });

  it('замыкается ценой под ключ — той же, что на карточке', () => {
    render(<Catalog products={[plainProduct, discountedProduct]} now={NOW} />);

    const row = screen.getByRole('rowheader', { name: 'Цена под ключ' }).closest('tr');
    if (row === null) throw new Error('Строка цены не найдена');

    expect(within(row).getByText('34 900 ₽')).toBeInTheDocument();
    // у модели со скидкой в сравнении стоит действующая цена, а не перечёркнутая
    expect(within(row).getByText('33 900 ₽')).toBeInTheDocument();
    expect(within(row).queryByText('38 500 ₽')).not.toBeInTheDocument();
  });

  it('без характеристик таблицы нет — сравнивать нечего', () => {
    render(<Catalog products={[{ ...plainProduct, specs: [] }]} now={NOW} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Сплит-система 07' })).toBeInTheDocument();
  });
});

describe('Каталог — скидка', () => {
  it('показывает действующую цену, зачёркнутую старую и вычисленный процент', () => {
    render(<Catalog products={[discountedProduct]} now={NOW} />);

    // цену ищем внутри карточки: та же сумма стоит и в строке сравнения
    const card = within(screen.getByRole('listitem'));
    expect(card.getByText('33 900 ₽')).toBeInTheDocument();

    const old = card.getByText(/38 500 ₽/);
    expect(old.closest('s')).not.toBeNull();

    // 1 − 33 900 / 38 500 = 11,9% → −12%
    expect(screen.getByText('−12%')).toBeInTheDocument();
  });

  it('показывает срок действия микроподписью, когда он задан', () => {
    render(<Catalog products={[discountedProduct]} now={NOW} />);

    expect(screen.getByText('до 31 октября 2026')).toBeInTheDocument();
  });

  it('вместо процента печатает подпись владельца, а срока без даты не выдумывает', () => {
    render(<Catalog products={[labelledSaleProduct]} now={NOW} />);

    expect(screen.getByText('Последняя в наличии')).toBeInTheDocument();
    // срок — это дата; «до 50 м²» рядом — площадь, её ловить нельзя
    expect(screen.queryByText(/^до \d+ [а-яё]+ \d{4}$/)).not.toBeInTheDocument();
  });

  it('товар без скидки рисуется без плашки и без перечёркнутой цены', () => {
    render(<Catalog products={[plainProduct]} now={NOW} />);

    expect(within(screen.getByRole('listitem')).getByText('34 900 ₽')).toBeInTheDocument();
    expect(document.querySelector('s')).toBeNull();
    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();
  });

  it('закончившаяся скидка не оставляет следов на карточке', () => {
    render(<Catalog products={[expiredSaleProduct]} now={NOW} />);

    expect(within(screen.getByRole('listitem')).getByText('74 500 ₽')).toBeInTheDocument();
    expect(screen.queryByText('69 900 ₽')).not.toBeInTheDocument();
    expect(document.querySelector('s')).toBeNull();
  });
});

describe('Каталог — карточка', () => {
  it('модель без фото получает заглушку с классом мощности, а не битую картинку', () => {
    render(<Catalog products={[plainProduct]} now={NOW} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Класс мощности 07')).toBeInTheDocument();
  });

  it('фотография подписана осмысленным alt с географией', () => {
    render(<Catalog products={[discountedProduct]} now={NOW} />);

    expect(
      screen.getByAltText('Сплит-система 09 — купить в Туле с установкой'),
    ).toBeInTheDocument();
  });

  it('кнопка заказа ведёт на форму заявки', () => {
    render(<Catalog products={[plainProduct]} now={NOW} orderHref="#lead" />);

    expect(screen.getByRole('link', { name: 'Заказать' })).toHaveAttribute('href', '#lead');
  });

  it('ссылка к поставщику внешняя и не передаёт ему вес', () => {
    render(<Catalog products={[uniqueSpecProduct]} now={NOW} />);

    const link = screen.getByRole('link', { name: /Страница модели у поставщика/ });
    expect(link).toHaveAttribute('href', 'https://example.com/split-12');
    expect(link).toHaveAttribute('rel', expect.stringContaining('nofollow'));
  });
});

describe('Каталог — пустые состояния', () => {
  it('пустой каталог не ломает вёрстку: заголовок на месте, таблицы нет', () => {
    render(<Catalog products={[]} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Купить кондиционер в Туле' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Каталог пока пуст')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('на время загрузки показывает скелетоны вместо прыгающей вёрстки', () => {
    const { container } = render(<Catalog products={[]} loading />);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Каталог пока пуст')).not.toBeInTheDocument();
  });
});
