import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { productSchema, type Product } from '@/entities/product/model';
import { formatMoney } from '@/shared/lib/format';
import { ProductPrice } from '@/widgets/catalog/ui/ProductPrice';

import { SITE_URL } from './fixtures';
import { buildItemListJsonLd, buildProductJsonLd } from './product';
import { organizationId } from './organization';

/** Момент, относительно которого считается скидка. Фиксированный: иначе тест «протухнет». */
const NOW = new Date('2026-08-20T09:00:00.000Z');

function makeProduct(overrides: Partial<Product> = {}): Product {
  return productSchema.parse({
    id: 'p1',
    slug: 'split-09',
    badge: '09',
    name: 'Сплит-система 09',
    brand: 'Пример',
    sku: 'PRM-09',
    areaMax: 27,
    priceNum: 42900,
    seoDescription: 'Кондиционер на 27 м² с монтажом под ключ',
    photos: [{ id: 'ph1', url: '/media/split-09.jpg', alt: 'Сплит-система 09', isMain: true }],
    specs: [{ k: 'Мощность охлаждения', v: '2.6 кВт' }],
    ...overrides,
  });
}

/** Скидка, заданная как в админке: конечная цена и период по времени Тулы. */
const onSale = makeProduct({
  salePrice: 34900,
  saleFrom: new Date('2026-08-01T21:00:00.000Z'),
  saleTo: new Date('2026-10-31T20:59:59.999Z'),
});

/** Предложение из собранной разметки товара. */
function offerOf(input: Parameters<typeof buildProductJsonLd>[0]) {
  return buildProductJsonLd(input)?.offers;
}

describe('Product и Offer', () => {
  it('собирает карточку товара из его же данных', () => {
    const product = makeProduct();
    const node = buildProductJsonLd({
      siteUrl: SITE_URL,
      path: '/katalog/split-09',
      product,
      price: getActivePrice(product, NOW),
    });

    expect(node).toMatchObject({
      '@type': 'Product',
      name: 'Сплит-система 09',
      sku: 'PRM-09',
      brand: { '@type': 'Brand', name: 'Пример' },
      description: 'Кондиционер на 27 м² с монтажом под ключ',
      url: `${SITE_URL}/katalog/split-09`,
      image: [`${SITE_URL}/media/split-09.jpg`],
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Мощность охлаждения', value: '2.6 кВт' },
      ],
    });
  });

  it('без скидки в предложении обычная цена и никакого priceValidUntil', () => {
    const product = makeProduct();
    const offer = offerOf({
      siteUrl: SITE_URL,
      path: '/katalog/split-09',
      product,
      price: getActivePrice(product, NOW),
    });

    expect(offer).toEqual({
      '@type': 'Offer',
      url: `${SITE_URL}/katalog/split-09`,
      price: 42900,
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': organizationId(SITE_URL) },
    });
  });

  it('🔴 при активной скидке в разметке действующая цена и срок из saleTo', () => {
    const offer = offerOf({
      siteUrl: SITE_URL,
      path: '/katalog/split-09',
      product: onSale,
      price: getActivePrice(onSale, NOW),
    });

    expect(offer).toMatchObject({ price: 34900, priceValidUntil: '2026-10-31' });
  });

  it('🔴 закончившаяся скидка уносит с собой и цену, и priceValidUntil', () => {
    const after = new Date('2026-11-02T09:00:00.000Z');
    const offer = offerOf({
      siteUrl: SITE_URL,
      path: '/katalog/split-09',
      product: onSale,
      price: getActivePrice(onSale, after),
    });

    expect(offer).toMatchObject({ price: 42900 });
    expect(offer).not.toHaveProperty('priceValidUntil');
  });

  it('🔴 инвариант 9: цена в разметке — та же, что видит человек на витрине', () => {
    const price = getActivePrice(onSale, NOW);
    const offer = offerOf({ siteUrl: SITE_URL, path: '/katalog/split-09', product: onSale, price });

    // на витрину и в разметку уходит один и тот же результат getActivePrice
    const { container } = render(<ProductPrice price={price} />);

    expect(offer).toMatchObject({ price: price.currentPrice });
    expect(container.textContent).toContain(formatMoney(price.currentPrice));
    // перечёркнутая цена в разметку не уходит — предложение описывает
    // действующую цену, а не историю каталога
    expect(offer).not.toMatchObject({ price: onSale.priceNum });
    expect(container.textContent).toContain(formatMoney(onSale.priceNum));
  });

  it('наличие берётся из видимости модели, а не из умолчания', () => {
    const hidden = makeProduct({ visible: false });
    const offer = offerOf({
      siteUrl: SITE_URL,
      path: '/katalog/split-09',
      product: hidden,
      price: getActivePrice(hidden, NOW),
    });

    expect(offer).toMatchObject({ availability: 'https://schema.org/OutOfStock' });
  });

  it('модель без фотографий, бренда и описания не даёт пустых полей', () => {
    const bare = makeProduct({
      photos: [],
      specs: [],
      brand: null,
      sku: null,
      seoDescription: null,
    });
    const node = buildProductJsonLd({
      siteUrl: SITE_URL,
      path: '/katalog/split-09',
      product: bare,
      price: getActivePrice(bare, NOW),
    });

    expect(node).not.toHaveProperty('image');
    expect(node).not.toHaveProperty('brand');
    expect(node).not.toHaveProperty('sku');
    expect(node).not.toHaveProperty('description');
    expect(node).not.toHaveProperty('additionalProperty');
  });
});

describe('ItemList листинга', () => {
  it('нумерует карточки в порядке витрины', () => {
    expect(
      buildItemListJsonLd({
        siteUrl: SITE_URL,
        name: 'Каталог',
        items: [
          { name: 'Сплит 07', path: '/katalog/split-07' },
          { name: 'Сплит 09', path: '/katalog/split-09' },
        ],
      }),
    ).toEqual({
      '@type': 'ItemList',
      name: 'Каталог',
      numberOfItems: 2,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Сплит 07',
          url: `${SITE_URL}/katalog/split-07`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Сплит 09',
          url: `${SITE_URL}/katalog/split-09`,
        },
      ],
    });
  });

  it('пустой каталог разметки не порождает', () => {
    expect(buildItemListJsonLd({ siteUrl: SITE_URL, items: [] })).toBeNull();
  });
});
