import { describe, expect, it } from 'vitest';

import { settingKeySchema } from '@/entities/settings/model';

import {
  ADMIN_COUNTER_TITLES,
  ADMIN_SECTIONS,
  ADMIN_TABS,
  bottomSectionsFor,
  columnSectionsFor,
  moreSectionsFor,
  navHrefOf,
  sectionAllows,
  sectionOf,
  sectionsFor,
  settingsSectionsFor,
  waitingTitleOf,
} from './content';
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

  /* 🔴 Адрес «Обзора» — начало каждого адреса панели, и по общему правилу он
     забрал бы себе весь раздел вместе с ролями. */
  it('«Обзор» владеет только сводкой, а не всей панелью', () => {
    expect(sectionOf('/admin')?.href).toBe('/admin');
    expect(sectionOf('/admin/stock')?.href).toBe('/admin/stock');
    expect(sectionOf('/admin/catalog/42')?.href).toBe('/admin/catalog');
  });

  /* Разделы конфигурации в колонке не стоят, и подсветка на них пропала бы
     вовсе — вместо них горит пункт, через который в них заходят (ADR-188). */
  it('страницы настроек подсвечивают пункт «Настройки»', () => {
    expect(navHrefOf('/admin/company')).toBe('/admin/settings');
    expect(navHrefOf('/admin/prices')).toBe('/admin/settings');
    expect(navHrefOf('/admin/notifications')).toBe('/admin/settings');
    expect(navHrefOf('/admin/catalog/42')).toBe('/admin/catalog');
    expect(navHrefOf('/admin/nothing-here')).toBeUndefined();
  });

  it('колонка, прибитый низ и настройки не пересекаются', () => {
    const column = columnSectionsFor('owner').map((section) => section.href);
    const bottom = bottomSectionsFor('owner').map((section) => section.href);
    const settings = settingsSectionsFor('owner').map((section) => section.href);

    expect(column).toContain('/admin/catalog');
    expect(bottom).toEqual(['/admin/settings', '/admin/profile']);
    expect(settings).toEqual(['/admin/company', '/admin/prices', '/admin/notifications']);

    for (const href of [...bottom, ...settings]) {
      expect(column).not.toContain(href);
    }
  });

  /* 🔴 Новый раздел заводится с ролью владельца: `sectionAllows` — настоящая
     проверка, по ней раскладка разворачивает монтажника. */
  it('монтажника не пускает в настройки', () => {
    expect(sectionAllows('/admin/settings', 'installer')).toBe(false);
    expect(sectionAllows('/admin/settings', 'owner')).toBe(true);
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

/**
 * Что лежит за «Ещё» и что там ждёт (issue #670).
 *
 * 🔴 Разбор вынесен из компонентов сюда потому, что от него зависит правдивость
 * признака: точка на кнопке обязана гореть ровно тогда, когда за ней работа.
 * Проверять это через отрисовку значило бы проверять вёрстку вместо правила.
 */
describe('очереди за «Ещё»', () => {
  const owner = moreSectionsFor('owner');

  it('за «Ещё» лежит всё, что не попало во вкладки, и служебные пункты', () => {
    expect(owner.map((section) => section.href)).toEqual([
      ...columnSectionsFor('owner')
        .slice(ADMIN_TABS)
        .map((section) => section.href),
      ...bottomSectionsFor('owner').map((section) => section.href),
    ]);
  });

  /* 🔴 «Заказы» и «Заявки» стоят отдельными вкладками рядом с «Ещё»: их числа
     за кнопкой не спрятаны, и признак от них загораться не должен. Без этой
     проверки точка горела бы у владельца почти всегда — а горящая всегда
     точка перестаёт быть признаком. */
  it('очереди из вкладок признак не зажигают', () => {
    expect(waitingTitleOf(owner, { orders: 7, leads: 3 })).toBeNull();
  });

  it('ждущая очередь названа числом и словами', () => {
    expect(waitingTitleOf(owner, { orders: 7, leads: 3, reviews: 2 })).toBe(
      `2 ${ADMIN_COUNTER_TITLES.reviews}`,
    );
  });

  /* 🔴 Ноль в колонке рисуется намеренно: «отзывов на модерации нет» — ответ.
     На кнопке тот же ноль означал бы «есть повод открыть». */
  it('ноль ожиданием не считается', () => {
    expect(waitingTitleOf(owner, { reviews: 0 })).toBeNull();
  });

  it('без чисел признака нет вовсе', () => {
    expect(waitingTitleOf(owner, undefined)).toBeNull();
    expect(waitingTitleOf(owner, {})).toBeNull();
  });

  /* Очереди все владельца: монтажнику за «Ещё» ждать нечего, и разделов сверх
     вкладок у него там тоже нет. */
  it('монтажнику признак не достаётся', () => {
    expect(waitingTitleOf(moreSectionsFor('installer'), { orders: 7, reviews: 2 })).toBeNull();
  });
});
