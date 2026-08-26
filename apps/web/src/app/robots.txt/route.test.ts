// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const { testEnv } = vi.hoisted(() => ({ testEnv: { SITE_URL: 'https://example.test' } }));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));

const { GET } = await import('./route');

async function robots(): Promise<string> {
  return GET().text();
}

describe('robots.txt', () => {
  it('закрывает админку и API, остальное разрешает', async () => {
    const text = await robots();

    expect(text).toContain('User-agent: *');
    expect(text).toContain('Allow: /\n');
    expect(text).toContain('Disallow: /admin');
    expect(text).toContain('Disallow: /api');
  });

  it('🔴 фото товаров под /api/media открыты роботу: на них ссылаются разметка и og:image', async () => {
    // более специфичное Allow побеждает Disallow: /api — так работают оба поисковика
    expect(await robots()).toContain('Allow: /api/media/');
  });

  it('ссылается на карту сайта абсолютным адресом', async () => {
    expect(await robots()).toContain('Sitemap: https://example.test/sitemap.xml');
  });

  it('🔴 Clean-param снимает дубли по параметрам фильтра каталога (ADR-109)', async () => {
    const text = await robots();

    expect(text).toContain('Clean-param: class&area&sale&sort&compare /catalog');
  });

  it('🔴 разбивка в Clean-param не попадает: у страниц разное содержимое', async () => {
    const line = (await robots()).split('\n').find((row) => row.startsWith('Clean-param:'));

    expect(line).toBeDefined();
    expect(line).not.toContain('page');
  });

  it('отдаётся текстом в UTF-8, а не как HTML', () => {
    expect(GET().headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });
});
