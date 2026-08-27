import { describe, expect, it } from 'vitest';

import { settingKeySchema } from '@/entities/settings/model';

import { ADMIN_SECTIONS, sectionAllows, sectionOf, sectionsFor } from './content';
import { adminSummaryContent } from './summary-content';

describe('разделы панели по ролям', () => {
  it('владелец видит все разделы', () => {
    expect(sectionsFor('owner')).toHaveLength(ADMIN_SECTIONS.length);
  });

  it('монтажнику остаются календарь, его наряды и профиль', () => {
    expect(sectionsFor('installer').map((section) => section.href)).toEqual([
      '/admin/crm',
      '/admin/orders',
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
    /* Черновик наряда по обращению живёт в разделе заявок и закрыт вместе с
       ним: клиентов и обращений монтажник не видит вовсе (CRM.md §6). */
    expect(sectionAllows('/admin/leads/l1/order', 'installer')).toBe(false);
  });

  it('сводка монтажнику не адресована: она про готовность сайта и модерацию', () => {
    expect(sectionAllows('/admin', 'installer')).toBe(false);
  });

  it('свои разделы монтажнику открыты', () => {
    expect(sectionAllows('/admin/crm', 'installer')).toBe(true);
    /* Наряды — рабочий экран монтажника: чужие в нём отсекает сервер, а не
       список разделов (CRM.md §6). */
    expect(sectionAllows('/admin/orders', 'installer')).toBe(true);
    expect(sectionAllows('/admin/orders/o1', 'installer')).toBe(true);
    expect(sectionAllows('/admin/profile', 'installer')).toBe(true);
  });
});

describe('названия групп настроек', () => {
  /* Запасной вариант `groupTitle` — сам ключ, и молчаливо: группа
     `notifications` доехала до плашки готовности английским словом среди
     русских ярлыков. Ключ в базе живёт своей жизнью, ярлык своей, и связать
     их может только проверка. */
  it('🔴 ни один ключ настроек не показывается владельцу как есть', () => {
    for (const key of settingKeySchema.options) {
      expect(adminSummaryContent.groupTitle(key), `нет русского названия для «${key}»`).not.toBe(
        key,
      );
    }
  });
});
