import { describe, expect, it } from 'vitest';

import { SITE_URL, seoFixture } from './fixtures';
import { buildPageMetadata, buildTitle } from './metadata';

describe('Метаданные страницы', () => {
  it('каноникал абсолютный и без завершающего слэша', () => {
    const meta = buildPageMetadata({ siteUrl: SITE_URL, path: '/catalog', title: 'Каталог' });

    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/catalog`);
  });

  it('суффикс бренда приходит из настроек и не дублируется', () => {
    expect(buildTitle('Каталог', 'Пример Климат')).toBe('Каталог | Пример Климат');
    expect(buildTitle('Каталог | Пример Климат', 'Пример Климат')).toBe('Каталог | Пример Климат');
  });

  it('🔴 без суффикса в настройках заголовок остаётся как есть — своего мы не подставляем', () => {
    expect(buildTitle('Каталог', '')).toBe('Каталог');
    expect(buildTitle('Каталог', null)).toBe('Каталог');
  });

  it('Open Graph собирается из тех же данных, что и заголовок', () => {
    const meta = buildPageMetadata({
      siteUrl: SITE_URL,
      path: '/',
      title: seoFixture.homeTitle,
      description: seoFixture.homeDescription,
      titleSuffix: seoFixture.titleSuffix,
      image: seoFixture.ogImage,
      siteName: 'Пример Климат',
    });

    expect(meta.title).toBe(`${seoFixture.homeTitle} | ${seoFixture.titleSuffix}`);
    expect(meta.description).toBe(seoFixture.homeDescription);
    expect(meta.openGraph).toMatchObject({
      type: 'website',
      url: `${SITE_URL}/`,
      locale: 'ru_RU',
      siteName: 'Пример Климат',
      images: [`${SITE_URL}/media/og.png`],
    });
  });

  it('пустое описание полем не становится', () => {
    const meta = buildPageMetadata({
      siteUrl: SITE_URL,
      path: '/prices',
      title: 'Цены',
      description: '',
    });

    expect(meta).not.toHaveProperty('description');
    expect(meta.openGraph).not.toHaveProperty('description');
  });

  it('закрытая от индексации страница получает robots', () => {
    const meta = buildPageMetadata({
      siteUrl: SITE_URL,
      path: '/admin',
      title: 'Админка',
      noIndex: true,
    });

    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it('🔴 фильтр каталога закрыт от индекса, но обходится по ссылкам (ADR-109)', () => {
    const meta = buildPageMetadata({
      siteUrl: SITE_URL,
      path: '/catalog',
      title: 'Каталог',
      noIndex: true,
      follow: true,
    });

    // noindex, follow: вес собирается на чистом адресе, а карточки моделей
    // робот всё равно находит
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/catalog`);
  });

  it('открытая страница про robots не заявляет ничего', () => {
    const meta = buildPageMetadata({
      siteUrl: SITE_URL,
      path: '/catalog',
      title: 'Каталог',
      follow: true,
    });

    expect(meta).not.toHaveProperty('robots');
  });
});
