import { describe, expect, it } from 'vitest';

import { buildArticleJsonLd } from './article';
import { SITE_URL } from './fixtures';
import { organizationId } from './organization';

const article = {
  title: 'Инвертор или обычный кондиционер',
  excerpt: 'Разбираем, за сколько окупается инвертор',
  seoDescription: null,
  // календарный день по времени Тулы — так его записывает админка
  date: new Date('2026-05-11T21:00:00.000Z'),
  updatedAt: new Date('2026-06-01T08:30:00.000Z'),
  cover: '/media/invertor.jpg',
};

describe('Article', () => {
  it('собирает статью с датами публикации и правки', () => {
    const node = buildArticleJsonLd({
      siteUrl: SITE_URL,
      path: '/baza-znaniy/invertor-ili-on-off',
      article,
      hasOrganization: true,
    });

    expect(node).toEqual({
      '@type': 'Article',
      '@id': `${SITE_URL}/baza-znaniy/invertor-ili-on-off#article`,
      headline: article.title,
      description: article.excerpt,
      url: `${SITE_URL}/baza-znaniy/invertor-ili-on-off`,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/baza-znaniy/invertor-ili-on-off`,
      },
      datePublished: '2026-05-12',
      dateModified: '2026-06-01',
      image: `${SITE_URL}/media/invertor.jpg`,
      inLanguage: 'ru-RU',
      author: { '@id': organizationId(SITE_URL) },
      publisher: { '@id': organizationId(SITE_URL) },
    });
  });

  it('своё описание из админки важнее анонса', () => {
    const node = buildArticleJsonLd({
      siteUrl: SITE_URL,
      path: '/baza-znaniy/a',
      article: { ...article, seoDescription: 'Описание для выдачи' },
    });

    expect(node?.description).toBe('Описание для выдачи');
  });

  it('🔴 без заполненной компании автора и издателя в разметке нет', () => {
    const node = buildArticleJsonLd({ siteUrl: SITE_URL, path: '/baza-znaniy/a', article });

    expect(node).not.toHaveProperty('author');
    expect(node).not.toHaveProperty('publisher');
  });

  it('статья без обложки и анонса не даёт пустых полей', () => {
    const node = buildArticleJsonLd({
      siteUrl: SITE_URL,
      path: '/baza-znaniy/a',
      article: { title: 'Заголовок', date: article.date },
    });

    expect(node).toEqual({
      '@type': 'Article',
      '@id': `${SITE_URL}/baza-znaniy/a#article`,
      headline: 'Заголовок',
      url: `${SITE_URL}/baza-znaniy/a`,
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/baza-znaniy/a` },
      datePublished: '2026-05-12',
      inLanguage: 'ru-RU',
    });
  });

  it('статья без заголовка разметкой не становится', () => {
    expect(
      buildArticleJsonLd({
        siteUrl: SITE_URL,
        path: '/baza-znaniy/a',
        article: { ...article, title: ' ' },
      }),
    ).toBeNull();
  });
});
