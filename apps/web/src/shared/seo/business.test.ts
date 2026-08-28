import { describe, expect, it } from 'vitest';

import { buildLocalBusinessJsonLd, localBusinessId } from './business';
import {
  SITE_URL,
  addressFixture,
  areaFixture,
  companyFixture,
  contactsFixture,
  emptyArea,
  emptyGeo,
  geoFixture,
  paymentFixture,
} from './fixtures';
import { organizationId } from './organization';
import type { ReviewForSchema } from './reviews';

const reviews: readonly ReviewForSchema[] = [
  {
    name: 'Ирина',
    rating: 5,
    text: 'Поставили за день, всё чисто',
    createdAt: new Date('2026-07-01T10:00:00Z'),
  },
  {
    name: 'Павел',
    rating: 4,
    text: 'Приехали вовремя, цена как в смете',
    createdAt: new Date('2026-07-08T10:00:00Z'),
  },
];

describe('HVACBusiness', () => {
  it('собирает карточку бизнеса из настроек: адрес, часы, гео и регион', () => {
    const node = buildLocalBusinessJsonLd({
      siteUrl: SITE_URL,
      company: companyFixture,
      contacts: contactsFixture,
      address: addressFixture,
      geo: geoFixture,
      area: areaFixture,
      payment: paymentFixture,
    });

    expect(node?.['@type']).toBe('HVACBusiness');
    expect(node?.['@id']).toBe(localBusinessId(SITE_URL));
    expect(node?.parentOrganization).toEqual({ '@id': organizationId(SITE_URL) });
    // 🔴 машинные часы берутся из настроек как есть — вывести их из
    // человеческой записи нельзя, а расхождение — расхождение с контентом
    expect(node?.openingHours).toBe('Mo-Su 08:00-21:00');
    expect(node?.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: geoFixture.lat,
      longitude: geoFixture.lng,
    });
    expect(node?.areaServed).toEqual([
      { '@type': 'AdministrativeArea', name: 'Тула и Тульская область' },
    ]);
    expect(node?.paymentAccepted).toEqual(paymentFixture.methods);
    expect(node?.address).toMatchObject({ addressLocality: 'Тула' });
  });

  it('половина координат координатами не считается', () => {
    const half = buildLocalBusinessJsonLd({
      siteUrl: SITE_URL,
      company: companyFixture,
      geo: { lat: 54.19, lng: null },
    });

    expect(half?.geo).toBeUndefined();
  });

  it('пустые группы не порождают пустых полей', () => {
    const node = buildLocalBusinessJsonLd({
      siteUrl: SITE_URL,
      company: companyFixture,
      geo: emptyGeo,
      area: emptyArea,
    });

    expect(node).toEqual({
      '@type': 'HVACBusiness',
      '@id': localBusinessId(SITE_URL),
      name: companyFixture.name,
      url: `${SITE_URL}/`,
      description: companyFixture.tagline,
      parentOrganization: { '@id': organizationId(SITE_URL) },
    });
  });

  it('🔴 без отзывов нет ни одного узла отзыва в разметке', () => {
    const node = buildLocalBusinessJsonLd({ siteUrl: SITE_URL, company: companyFixture });

    expect(node?.review).toBeUndefined();
  });

  it('настоящие отзывы уезжают в разметку узлами Review', () => {
    const node = buildLocalBusinessJsonLd({
      siteUrl: SITE_URL,
      company: companyFixture,
      reviews,
    });

    expect(Array.isArray(node?.review) ? node?.review.length : 0).toBe(2);
  });

  /* 🔴 ADR-151: средней оценки о самом себе в разметке нет ни при каком числе
     отзывов. Google её у LocalBusiness не поддерживает, а видимого агрегата на
     странице нет — число в разметке было бы не подтверждено контентом. */
  it('🔴 средней оценки в узле бизнеса нет ни при каком числе отзывов', () => {
    const node = buildLocalBusinessJsonLd({
      siteUrl: SITE_URL,
      company: companyFixture,
      reviews,
    });

    expect(node?.aggregateRating).toBeUndefined();
  });
});
