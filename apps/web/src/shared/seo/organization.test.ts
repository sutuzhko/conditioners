import { describe, expect, it } from 'vitest';

import {
  SITE_URL,
  addressFixture,
  companyFixture,
  contactsFixture,
  emptyAddress,
  emptyCompany,
  emptyContacts,
  placeholderAddress,
  placeholderCompany,
  placeholderContacts,
  seoFixture,
  socialFixture,
} from './fixtures';
import {
  buildOrganizationJsonLd,
  buildPostalAddress,
  buildWebSiteJsonLd,
  organizationId,
} from './organization';

describe('Organization и WebSite', () => {
  it('собирает организацию из настроек — ни одного значения из кода', () => {
    const node = buildOrganizationJsonLd({
      siteUrl: SITE_URL,
      company: companyFixture,
      contacts: contactsFixture,
      address: addressFixture,
      social: socialFixture,
      seo: seoFixture,
    });

    expect(node).toEqual({
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: companyFixture.name,
      legalName: companyFixture.legalName,
      slogan: companyFixture.tagline,
      foundingDate: '2015',
      url: `${SITE_URL}/`,
      image: `${SITE_URL}/media/og.png`,
      telephone: contactsFixture.phones,
      email: contactsFixture.email,
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'RU',
        addressRegion: addressFixture.region,
        addressLocality: addressFixture.city,
        streetAddress: 'Примерная улица, 1, офис 2',
        postalCode: addressFixture.postalCode,
      },
      // пустая ссылка из настроек в sameAs не попадает
      sameAs: ['https://example.com/klimat'],
    });
  });

  it('🔴 без названия компании разметки нет: подставить своё нельзя', () => {
    expect(buildOrganizationJsonLd({ siteUrl: SITE_URL, company: emptyCompany })).toBeNull();
    expect(buildOrganizationJsonLd({ siteUrl: SITE_URL })).toBeNull();
  });

  it('🔴 заглушки сидов не становятся разметкой', () => {
    expect(
      buildOrganizationJsonLd({
        siteUrl: SITE_URL,
        company: placeholderCompany,
        contacts: placeholderContacts,
        address: placeholderAddress,
      }),
    ).toBeNull();
  });

  it('незаполненные группы не порождают пустых полей', () => {
    const node = buildOrganizationJsonLd({
      siteUrl: SITE_URL,
      company: { ...emptyCompany, name: 'Пример' },
      contacts: emptyContacts,
      address: emptyAddress,
    });

    expect(node).toEqual({
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Пример',
      url: `${SITE_URL}/`,
    });
  });

  it('адрес без единой заполненной части полем не становится', () => {
    expect(buildPostalAddress(emptyAddress)).toBeUndefined();
    expect(buildPostalAddress(null)).toBeUndefined();
  });

  it('единственный телефон остаётся строкой, а не массивом из одного элемента', () => {
    const node = buildOrganizationJsonLd({
      siteUrl: SITE_URL,
      company: companyFixture,
      contacts: { ...contactsFixture, phones: ['+74872000000'] },
    });

    expect(node?.telephone).toBe('+74872000000');
  });

  it('WebSite ссылается на ту же организацию по @id', () => {
    const node = buildWebSiteJsonLd({ siteUrl: SITE_URL, company: companyFixture });

    expect(node).toEqual({
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: companyFixture.name,
      inLanguage: 'ru-RU',
      publisher: { '@id': organizationId(SITE_URL) },
    });
  });

  it('WebSite без названия компании тоже не появляется', () => {
    expect(buildWebSiteJsonLd({ siteUrl: SITE_URL, company: emptyCompany })).toBeNull();
  });
});
