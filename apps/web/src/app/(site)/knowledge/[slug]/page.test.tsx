import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { testEnv, repoMock, settingsMock, notFoundMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-articles',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
  repoMock: { findPublishedBySlug: vi.fn(), listPublished: vi.fn() },
  settingsMock: { getAll: vi.fn() },
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/repo/articles', () => repoMock);
vi.mock('@/server/repo/settings', () => settingsMock);
vi.mock('next/navigation', () => ({ notFound: notFoundMock }));

const { default: ArticlePage, generateMetadata, generateStaticParams } = await import('./page');

const ARTICLE = {
  id: 'a1',
  slug: 'kak-vybrat-kondicioner',
  title: 'Как выбрать кондиционер для квартиры',
  category: 'Выбор',
  date: '2026-06-14T00:00:00.000Z',
  minutes: 6,
  cover: null,
  excerpt: 'Мощность по площади, поправки и инвертор.',
  body: '## Шаг 1. Мощность\n\nПравило: **1 кВт** на 10 м².',
  published: true,
  seoTitle: null,
  seoDescription: null,
  updatedAt: '2026-06-20T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  settingsMock.getAll.mockResolvedValue({
    company: { name: 'ТулаКлимат' },
    seo: { titleSuffix: 'ТулаКлимат' },
  });
});

describe('Страница статьи', () => {
  it('🔴 неизвестный слаг отдаёт 404, а не пустую страницу', async () => {
    repoMock.findPublishedBySlug.mockResolvedValue(null);

    await expect(ArticlePage({ params: Promise.resolve({ slug: 'net-takoy' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('🔴 текст статьи приходит с сервера готовым — статьи ради поиска и живут', async () => {
    repoMock.findPublishedBySlug.mockResolvedValue(ARTICLE);

    render(await ArticlePage({ params: Promise.resolve({ slug: ARTICLE.slug }) }));

    expect(screen.getByRole('heading', { level: 1, name: ARTICLE.title })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Шаг 1. Мощность' })).toBeInTheDocument();
    expect(screen.getByText(/на 10 м²/)).toBeInTheDocument();
  });

  it('черновик для читателя не существует: репозиторий отдаёт только опубликованные', async () => {
    repoMock.findPublishedBySlug.mockResolvedValue(null);

    await expect(ArticlePage({ params: Promise.resolve({ slug: ARTICLE.slug }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(repoMock.findPublishedBySlug).toHaveBeenCalledWith(ARTICLE.slug);
  });

  it('статические адреса собираются по опубликованным статьям', async () => {
    repoMock.listPublished.mockResolvedValue([ARTICLE, { ...ARTICLE, slug: 'uhod' }]);

    await expect(generateStaticParams()).resolves.toEqual([
      { slug: 'kak-vybrat-kondicioner' },
      { slug: 'uhod' },
    ]);
  });

  it('метаданные собираются из статьи: заголовок, описание и абсолютный каноникал', async () => {
    repoMock.findPublishedBySlug.mockResolvedValue(ARTICLE);

    const meta = await generateMetadata({ params: Promise.resolve({ slug: ARTICLE.slug }) });

    expect(meta.title).toContain(ARTICLE.title);
    expect(meta.description).toBe(ARTICLE.excerpt);
    expect(meta.alternates?.canonical).toBe(`https://example.test/knowledge/${ARTICLE.slug}`);
  });

  it('🔴 свой `seoTitle` статьи главнее шаблона и не получает суффикс бренда', async () => {
    repoMock.findPublishedBySlug.mockResolvedValue({
      ...ARTICLE,
      seoTitle: 'Выбор кондиционера по площади — таблица классов',
      seoDescription: 'Своё описание для выдачи.',
    });

    const meta = await generateMetadata({ params: Promise.resolve({ slug: ARTICLE.slug }) });

    expect(meta.title).toBe('Выбор кондиционера по площади — таблица классов');
    expect(meta.description).toBe('Своё описание для выдачи.');
  });

  it('неизвестный слаг не описывает несуществующую страницу', async () => {
    repoMock.findPublishedBySlug.mockResolvedValue(null);

    await expect(
      generateMetadata({ params: Promise.resolve({ slug: 'net-takoy' }) }),
    ).resolves.toEqual({});
  });
});
