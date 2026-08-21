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
    expect(rule?.allow).toBe('/');
    expect(rule?.disallow).toEqual(['/admin', '/api']);
  });

  it('ссылается на карту сайта абсолютным адресом', () => {
    expect(robots().sitemap).toBe('https://example.test/sitemap.xml');
  });
});
