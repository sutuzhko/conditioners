// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const { testEnv } = vi.hoisted(() => ({ testEnv: { SITE_URL: 'https://example.test' } }));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));

const { default: robots } = await import('./robots');

describe('robots.txt', () => {
  it('закрывает админку и API, остальное разрешает', () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;

    expect(rule?.userAgent).toBe('*');
    expect(rule?.allow).toContain('/');
    expect(rule?.disallow).toEqual(['/admin', '/api']);
  });

  it('🔴 фото товаров под /api/media открыты роботу: на них ссылаются разметка и og:image', () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;

    // более специфичное Allow побеждает Disallow: /api — так работают оба поисковика
    expect(rule?.allow).toContain('/api/media/');
  });

  it('ссылается на карту сайта абсолютным адресом', () => {
    expect(robots().sitemap).toBe('https://example.test/sitemap.xml');
  });
});
