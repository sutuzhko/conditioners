import { describe, expect, it } from 'vitest';

import { ADMIN_SECTIONS, sectionAllows, sectionOf, sectionsFor } from './content';

describe('разделы панели по ролям', () => {
  it('владелец видит все разделы', () => {
    expect(sectionsFor('owner')).toHaveLength(ADMIN_SECTIONS.length);
  });

  it('монтажнику остаются календарь и профиль', () => {
    expect(sectionsFor('installer').map((section) => section.href)).toEqual([
      '/admin/crm',
      '/admin/profile',
    ]);
  });

  it('раздел определяется и по вложенному адресу', () => {
    expect(sectionOf('/admin/catalog/42')?.href).toBe('/admin/catalog');
    expect(sectionOf('/admin/team/u2')?.href).toBe('/admin/team');
  });

  it('похожее начало адреса чужой раздел не забирает', () => {
    expect(sectionOf('/admin/crm')?.href).toBe('/admin/crm');
    expect(sectionOf('/admin/crm-something')).toBeUndefined();
  });
});

describe('🔴 допуск по адресу', () => {
  it('владельца пускает везде', () => {
    for (const section of ADMIN_SECTIONS) {
      expect(sectionAllows(section.href, 'owner')).toBe(true);
    }
    expect(sectionAllows('/admin', 'owner')).toBe(true);
  });

  it('монтажника не пускает в разделы владельца — включая вложенные страницы', () => {
    expect(sectionAllows('/admin/catalog', 'installer')).toBe(false);
    expect(sectionAllows('/admin/catalog/42', 'installer')).toBe(false);
    expect(sectionAllows('/admin/team/u2', 'installer')).toBe(false);
    expect(sectionAllows('/admin/leads', 'installer')).toBe(false);
  });

  it('сводка монтажнику не адресована: она про готовность сайта и модерацию', () => {
    expect(sectionAllows('/admin', 'installer')).toBe(false);
  });

  it('свои разделы монтажнику открыты', () => {
    expect(sectionAllows('/admin/crm', 'installer')).toBe(true);
    expect(sectionAllows('/admin/profile', 'installer')).toBe(true);
  });
});
