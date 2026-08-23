import { describe, expect, it } from 'vitest';

import { SITE_URL, areaFixture, emptyArea } from './fixtures';
import { organizationId } from './organization';
import { buildServiceJsonLd } from './service';

describe('Service и OfferCatalog', () => {
  it('собирает услугу с прайсом: одна позиция каталога — одна строка таблицы цен', () => {
    const node = buildServiceJsonLd({
      siteUrl: SITE_URL,
      path: '/installation',
      name: 'Установка кондиционеров',
      description: 'Монтаж под ключ за один день',
      serviceType: 'Монтаж кондиционеров',
      area: areaFixture,
      catalogName: 'Цены на монтаж',
      offers: [
        { name: 'Монтаж класса 07', description: 'до 20 м²', price: 6000 },
        { name: 'Штробление', price: 900, unitText: 'за метр', from: true },
      ],
    });

    expect(node).toEqual({
      '@type': 'Service',
      '@id': `${SITE_URL}/installation#service`,
      name: 'Установка кондиционеров',
      description: 'Монтаж под ключ за один день',
      serviceType: 'Монтаж кондиционеров',
      url: `${SITE_URL}/installation`,
      provider: { '@id': organizationId(SITE_URL) },
      areaServed: [{ '@type': 'AdministrativeArea', name: 'Тула и Тульская область' }],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Цены на монтаж',
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: 'Монтаж класса 07', description: 'до 20 м²' },
            priceSpecification: {
              '@type': 'PriceSpecification',
              priceCurrency: 'RUB',
              price: 6000,
            },
          },
          {
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: 'Штробление' },
            priceSpecification: {
              '@type': 'PriceSpecification',
              priceCurrency: 'RUB',
              minPrice: 900,
              unitText: 'за метр',
            },
          },
        ],
      },
    });
  });

  it('услуга без прайса каталога предложений не выдумывает', () => {
    const node = buildServiceJsonLd({
      siteUrl: SITE_URL,
      path: '/service',
      name: 'Ремонт и обслуживание',
      area: emptyArea,
    });

    expect(node).toEqual({
      '@type': 'Service',
      '@id': `${SITE_URL}/service#service`,
      name: 'Ремонт и обслуживание',
      url: `${SITE_URL}/service`,
      provider: { '@id': organizationId(SITE_URL) },
    });
  });

  it('позиция без цены попадает в каталог, но без PriceSpecification', () => {
    const node = buildServiceJsonLd({
      siteUrl: SITE_URL,
      path: '/prices',
      name: 'Цены',
      offers: [{ name: 'Выезд мастера' }, { name: '  ' }],
    });

    const catalog = node?.hasOfferCatalog;
    expect(catalog).toEqual({
      '@type': 'OfferCatalog',
      name: 'Цены',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Выезд мастера' } },
      ],
    });
  });

  it('услуга без названия разметкой не становится', () => {
    expect(buildServiceJsonLd({ siteUrl: SITE_URL, path: '/prices', name: '  ' })).toBeNull();
  });
});
