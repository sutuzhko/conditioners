// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, dbMock, settingsMock } = vi.hoisted(() => ({
  testEnv: { SITE_URL: 'https://example.test' },
  dbMock: {
    article: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
  },
  settingsMock: { readiness: vi.fn() },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/db', () => ({ db: dbMock }));
vi.mock('@/server/repo/settings', () => settingsMock);

const { default: sitemap } = await import('./sitemap');

const ARTICLE_UPDATED = new Date('2026-07-15T09:00:00.000Z');
const PRODUCT_UPDATED = new Date('2026-08-02T12:00:00.000Z');

describe('Карта сайта', () => {
  beforeEach(() => {
    dbMock.article.findMany.mockResolvedValue([
      { slug: 'invertor-ili-on-off', updatedAt: ARTICLE_UPDATED },
    ]);
    dbMock.product.findMany.mockResolvedValue([{ slug: 'split-09', updatedAt: PRODUCT_UPDATED }]);
    settingsMock.readiness.mockResolvedValue({ ready: true, groups: [] });
  });

  /* 🔴 Пока обязательные настройки не заполнены, публичная часть отдаёт
     `noindex` — карта из таких адресов спорит сама с собой (ADR-153). */
  it('🔴 при незаполненных настройках карта пуста: все страницы под noindex', async () => {
    settingsMock.readiness.mockResolvedValue({
      ready: false,
      groups: [{ key: 'company', ready: false, issues: [{ field: '', reason: 'missing' }] }],
    });

    expect(await sitemap()).toEqual([]);
    expect(dbMock.article.findMany).not.toHaveBeenCalled();
    expect(dbMock.product.findMany).not.toHaveBeenCalled();
  });

  it('содержит все статические страницы абсолютными адресами', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://example.test/');
    expect(urls).toContain('https://example.test/catalog');
    expect(urls).toContain('https://example.test/knowledge');
    expect(urls).toContain('https://example.test/privacy');
    expect(urls.every((url) => url.startsWith('https://example.test'))).toBe(true);
  });

  it('🔴 знает товарные адреса: страницы моделей существуют (ADR-109)', async () => {
    const entries = await sitemap();

    expect(entries).toContainEqual({
      url: 'https://example.test/catalog/split-09',
      lastModified: PRODUCT_UPDATED,
    });
  });

  it('🔴 снятые с продажи модели в карту не попадают', async () => {
    await sitemap();

    expect(dbMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { visible: true } }),
    );
  });

  it('добавляет статьи с датой правки из базы', async () => {
    const entries = await sitemap();

    expect(entries).toContainEqual({
      url: 'https://example.test/knowledge/invertor-ili-on-off',
      lastModified: ARTICLE_UPDATED,
    });
  });

  it('🔴 черновики статей в карту не попадают', async () => {
    await sitemap();

    expect(dbMock.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true } }),
    );
  });

  it('удалённых страниц кластера в карте нет (ADR-049)', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    // каталог из этого списка вернулся (ADR-109), остальные страницы кластера — нет
    for (const gone of ['/prices', '/installation', '/service', '/contacts']) {
      expect(urls).not.toContain(`https://example.test${gone}`);
    }
  });

  it('у статических страниц даты правки нет — выдуманной тоже', async () => {
    const entries = await sitemap();
    const home = entries.find((entry) => entry.url === 'https://example.test/');

    expect(home).toEqual({ url: 'https://example.test/' });
  });

  it('пустая база оставляет только статические адреса', async () => {
    dbMock.article.findMany.mockResolvedValue([]);
    dbMock.product.findMany.mockResolvedValue([]);

    const entries = await sitemap();

    expect(entries.some((entry) => entry.url.includes('/knowledge/'))).toBe(false);
    expect(entries.some((entry) => entry.url.includes('/catalog/'))).toBe(false);
  });
});
