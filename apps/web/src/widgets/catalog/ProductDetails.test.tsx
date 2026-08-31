import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ProductDetails } from './ProductDetails';
import { catalogText, productPageText as t } from './content';
import {
  catalogFixture,
  discountedProduct,
  expiredSaleProduct,
  galleryProduct,
  NOW,
  plainProduct,
  productHrefFixture,
  specDictionaryFixture,
  uniqueSpecProduct,
} from './fixtures';
import type { CatalogProduct } from './model';
import { similarProducts } from './model';

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

/** Страница со всеми дорогами: отметка сравнения и похожие модели. */
function renderFullDetails(product: CatalogProduct = discountedProduct) {
  return render(
    <ProductDetails
      product={product}
      catalogHref="/catalog"
      compareHref={{ pathname: '/catalog', query: { compare: product.slug }, hash: 'compare' }}
      similar={similarProducts(catalogFixture, product)}
      productHref={productHrefFixture}
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

    expect(screen.getByRole('link', { name: catalogText.all })).toHaveAttribute('href', '/catalog');
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

    // большой снимок плюс полоса миниатюр, в которой он тоже есть
    expect(screen.getAllByRole('img')).toHaveLength(galleryProduct.photos.length + 1);
    expect(screen.getByAltText('Внутренний блок вблизи')).toBeInTheDocument();
  });

  it('🔴 в полосе миниатюр есть открытый сейчас снимок и он отмечен', () => {
    const { container } = renderDetails(galleryProduct);

    const thumbs = container.querySelectorAll('ul li');
    expect(thumbs).toHaveLength(galleryProduct.photos.length);
    expect(thumbs[0]).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText(t.currentPhoto)).toBeInTheDocument();
  });

  it('единственный снимок полосу миниатюр не заводит', () => {
    const { container } = renderDetails(discountedProduct);

    expect(container.querySelectorAll('ul li')).toHaveLength(0);
    expect(screen.getAllByRole('img')).toHaveLength(1);
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

describe('Страница модели — дороги дальше', () => {
  it('🔴 под характеристиками есть второй путь к заявке — с темой вопроса', () => {
    renderFullDetails(plainProduct);

    expect(screen.getByRole('link', { name: t.ctaAction })).toHaveAttribute(
      'href',
      '/?model=split-07&topic=consult#lead',
    );
    expect(screen.getByText(t.ctaTitle)).toBeInTheDocument();
  });

  it('🔴 отметка сравнения ведёт в каталог с этой моделью (ADR-109)', () => {
    renderFullDetails(plainProduct);

    expect(
      screen.getByRole('link', { name: `${catalogText.compareAdd}: ${plainProduct.name}` }),
    ).toHaveAttribute('href', '/catalog?compare=split-07#compare');
  });

  it('без адреса сравнения отметки на странице нет', () => {
    renderDetails(plainProduct);

    expect(screen.queryByRole('link', { name: /Сравнить/ })).not.toBeInTheDocument();
  });

  it('похожие модели названы и ведут на свои страницы', () => {
    renderFullDetails(plainProduct);

    expect(screen.getByRole('heading', { name: t.similarTitle })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Сплит-система 09' })).toHaveAttribute(
      'href',
      '/catalog/split-09',
    );
  });

  it('похожих нет — раздела нет', () => {
    render(
      <ProductDetails
        product={plainProduct}
        catalogHref="/catalog"
        similar={[]}
        productHref={productHrefFixture}
        now={NOW}
        specDictionary={specDictionaryFixture}
      />,
    );

    expect(screen.queryByRole('heading', { name: t.similarTitle })).not.toBeInTheDocument();
  });
});

describe('Похожие модели — отбор', () => {
  it('🔴 сначала свой класс мощности, потом ближайшие по площади', () => {
    const picked = similarProducts(catalogFixture, discountedProduct);

    // в фикстуре класс 09 один — сам товар, поэтому список добирается
    // соседями по площади: от 25 м² ближе всего 20, потом 35, потом 50
    expect(picked.map((product) => product.slug)).toEqual(['split-07', 'split-12', 'split-18']);
  });

  it('сама модель в похожие не попадает', () => {
    const picked = similarProducts(catalogFixture, plainProduct);

    expect(picked.map((product) => product.slug)).not.toContain(plainProduct.slug);
  });

  it('скрытая модель в похожие не попадает', () => {
    const picked = similarProducts(
      [...catalogFixture, { ...uniqueSpecProduct, id: 'hidden-12', visible: false }],
      plainProduct,
    );

    expect(picked.map((product) => product.id)).not.toContain('hidden-12');
  });

  it('длина списка ограничена', () => {
    expect(similarProducts(catalogFixture, plainProduct, 2)).toHaveLength(2);
  });
});

/**
 * 🔴 Раскладку страницы держат правила CSS, а jsdom их не применяет.
 * Проверяем источник; поведение в браузере снято замером (issue #262).
 */
describe('Страница модели — раскладка по ширинам (issue #262)', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(join(here, 'ProductDetails.module.css'), 'utf8');
  const priceCss = readFileSync(join(here, 'ui', 'ProductPrice.module.css'), 'utf8');

  it('на телефоне одна колонка, две — с 600', () => {
    expect(css).toMatch(/\.main\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(
      /@media \(width >= 600px\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\) clamp\(280px, 26vw, 360px\)/,
    );
  });

  it('🔴 с 900 блок цены липнет и считает смещение от высоты шапки', () => {
    const wide = css.slice(css.indexOf('@media (width >= 900px)'));
    expect(wide).toMatch(/position:\s*sticky/);
    expect(wide).toMatch(/top:\s*calc\(var\(--header-h\) \+ 16px\)/);
    /* Потолок высоты обязателен: панель выше окна не липнет, а просто стоит,
       и её нижний край становится недостижим. */
    expect(wide).toMatch(/max-height:\s*calc\(100dvh - var\(--header-h\) - 32px\)/);
  });

  it('снимок держит своё место пропорцией, а не размером файла', () => {
    expect(css).toMatch(/\.mainPhoto\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10/);
    expect(css).toMatch(/\.fallback\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10/);
  });

  it('характеристики — определения в две колонки, а не таблица', () => {
    expect(css).toMatch(
      /\.specRow\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*auto\) minmax\(0,\s*1fr\)/,
    );
  });

  it('длина строки текста ограничена', () => {
    expect(css).toMatch(/\.lead\s*\{[^}]*width:\s*min\(100%,\s*680px\)/);
  });

  it('🔴 междустрочный интервал строки цены — множитель, а не пиксели', () => {
    /* В пикселях сравнивались коробки, но не выносные элементы: у мелкой
       приписки «под ключ» полуинтервал больше, и строка без скидки выходила
       на 1–2px выше — кнопка «Заказать» стояла не на одной высоте с той же
       кнопкой у модели со скидкой. Замерено в браузере. */
    expect(priceCss).toMatch(/\.main > \*\s*\{[^}]*line-height:\s*1\.15/);
  });
});
