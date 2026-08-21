// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, dbMock } = vi.hoisted(() => ({
  testEnv: { SITE_URL: 'https://example.test' },
  dbMock: {
    product: { findMany: vi.fn() },
    article: { findMany: vi.fn() },
  },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/db', () => ({ db: dbMock }));

const { default: sitemap } = await import('./sitemap');

const PRODUCT_UPDATED = new Date('2026-08-01T10:00:00.000Z');
const ARTICLE_UPDATED = new Date('2026-07-15T09:00:00.000Z');

describe('Карта сайта', () => {
  beforeEach(() => {
    dbMock.product.findMany.mockResolvedValue([{ slug: 'split-09', updatedAt: PRODUCT_UPDATED }]);
    dbMock.article.findMany.mockResolvedValue([
      { slug: 'invertor-ili-on-off', updatedAt: ARTICLE_UPDATED },
    ]);
  });

  it('содержит главную и страницы кластера абсолютными адресами', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://example.test/');
    expect(urls).toContain('https://example.test/catalog');
    expect(urls).toContain('https://example.test/installation');
    expect(urls).toContain('https://example.test/knowledge');
    expect(urls.every((url) => url.startsWith('https://example.test'))).toBe(true);
  });

  it('добавляет товары и статьи с датой правки из базы', async () => {
    const entries = await sitemap();

    expect(entries).toContainEqual({
      url: 'https://example.test/catalog/split-09',
      lastModified: PRODUCT_UPDATED,
    });
    expect(entries).toContainEqual({
      url: 'https://example.test/knowledge/invertor-ili-on-off',
      lastModified: ARTICLE_UPDATED,
    });
  });

  it('🔴 черновики и скрытые модели в карту не попадают', async () => {
    await sitemap();

    expect(dbMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { visible: true } }),
    );
    expect(dbMock.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true } }),
    );
  });

  it('у статических страниц даты правки нет — выдуманной тоже', async () => {
    const entries = await sitemap();
    const home = entries.find((entry) => entry.url === 'https://example.test/');

    expect(home).toEqual({ url: 'https://example.test/' });
  });

  it('пустая база оставляет только статические адреса', async () => {
    dbMock.product.findMany.mockResolvedValue([]);
    dbMock.article.findMany.mockResolvedValue([]);

    const entries = await sitemap();

    expect(entries.some((entry) => entry.url.includes('/catalog/'))).toBe(false);
    expect(entries.some((entry) => entry.url.includes('/knowledge/'))).toBe(false);
  });
});
