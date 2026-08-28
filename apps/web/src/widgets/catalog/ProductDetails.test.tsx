import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ProductDetails } from './ProductDetails';
import { productPageText as t } from './content';
import {
  discountedProduct,
  expiredSaleProduct,
  galleryProduct,
  NOW,
  plainProduct,
  specDictionaryFixture,
  uniqueSpecProduct,
} from './fixtures';
import type { CatalogProduct } from './model';

function renderDetails(product: CatalogProduct = discountedProduct) {
  return render(
    <ProductDetails
      product={product}
      catalogHref="/catalog"
      now={NOW}
      specDictionary={specDictionaryFixture}
    />,
  );
}

describe('Страница модели — кнопка заявки', () => {
  it('🔴 кнопка несёт к форме слаг этой модели и тему монтажа (ADR-129)', () => {
    renderDetails(plainProduct);

    expect(screen.getByRole('link', { name: t.order })).toHaveAttribute(
      'href',
      '/?model=split-07&topic=install#lead',
    );
  });
});

describe('Страница модели — заголовок и цена', () => {
  it('🔴 единственный h1 — название модели (инвариант 4)', () => {
    const { container } = renderDetails();

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Сплит-система 09');
  });

  it('показывает действующую цену, перечёркнутую старую и процент', () => {
    renderDetails();

    expect(screen.getByText('33 900 ₽')).toBeInTheDocument();
    expect(screen.getByText(/38 500 ₽/).closest('s')).not.toBeNull();
    expect(screen.getByText('−12%')).toBeInTheDocument();
  });

  it('закончившаяся скидка не оставляет следов', () => {
    renderDetails(expiredSaleProduct);

    expect(screen.getByText('74 500 ₽')).toBeInTheDocument();
    expect(document.querySelector('s')).toBeNull();
  });

  it('ссылка возврата ведёт в каталог', () => {
    renderDetails();

    expect(screen.getByRole('link', { name: t.backToCatalog })).toHaveAttribute('href', '/catalog');
  });

  it('класс и площадь названы текстом, а не только меткой на фото', () => {
    renderDetails(plainProduct);

    expect(screen.getByText(t.lead('07', 20))).toBeInTheDocument();
  });
});

describe('Страница модели — характеристики', () => {
  it('🔴 все характеристики в HTML и разложены по группам справочника (ADR-094)', () => {
    renderDetails(plainProduct);

    expect(screen.getByRole('heading', { name: 'Основное' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Шум и воздух' })).toBeInTheDocument();
    expect(screen.getByText('Компрессор')).toBeInTheDocument();
    expect(screen.getByText('21 дБ')).toBeInTheDocument();
  });

  it('🔴 характеристика вне справочника не исчезает, а уходит в «Прочее»', () => {
    renderDetails(uniqueSpecProduct);

    expect(screen.getByRole('heading', { name: 'Прочее' })).toBeInTheDocument();
    expect(screen.getByText('Wi-Fi управление')).toBeInTheDocument();
  });

  it('незаполненные характеристики объясняются, а не оставляют пустое место', () => {
    renderDetails({ ...plainProduct, specs: [] });

    expect(screen.getByText(t.specsEmpty)).toBeInTheDocument();
  });
});

describe('Страница модели — фотографии', () => {
  it('главное фото подписано alt с географией', () => {
    renderDetails();

    expect(
      screen.getByAltText('Сплит-система 09 — купить в Туле с установкой'),
    ).toBeInTheDocument();
  });

  it('🔴 все снимки лежат в разметке сразу, а не подгружаются по клику', () => {
    renderDetails(galleryProduct);

    expect(screen.getAllByRole('img')).toHaveLength(galleryProduct.photos.length);
    expect(screen.getByAltText('Внутренний блок вблизи')).toBeInTheDocument();
  });

  it('модель без фото получает заглушку с классом мощности', () => {
    renderDetails(plainProduct);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Класс мощности 07')).toBeInTheDocument();
  });

  it('ссылка к поставщику внешняя и не передаёт ему вес', () => {
    renderDetails(uniqueSpecProduct);

    const link = screen.getByRole('link', { name: /Страница модели у поставщика/ });
    expect(link).toHaveAttribute('href', 'https://example.com/split-12');
    expect(link).toHaveAttribute('rel', expect.stringContaining('nofollow'));
  });
});
