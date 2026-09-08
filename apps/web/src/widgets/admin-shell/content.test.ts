import { describe, expect, it } from 'vitest';

import { CLIENT_CYCLE } from '@/entities/staff/access';
import { ADMIN_ROLES } from '@/entities/staff/model';
import { settingKeySchema } from '@/entities/settings/model';

import {
  ADMIN_COUNTER_TITLES,
  ADMIN_ROLE_TITLES,
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

  /* 🔴 Готовность Фазы 1 плана «Роли» словами задачи: менеджер видит «Заявки»
     и не видит «Каталог» (issue #769). Список проверяется целиком, а не
     двумя `toContain`: раздел, приехавший к менеджеру по инерции с соседнего,
     иначе остался бы незамеченным. */
  it('🔴 менеджеру открыты заявки и профиль — и ничего сверх', () => {
    expect(sectionsFor('manager').map((section) => section.href)).toEqual([
      '/admin/leads',
      '/admin/profile',
    ]);
  });

  /* 🔴 Администратор получает разделы не по роли, а по переключателям
     владельца, и переключателей ещё нет (план «Роли», Фаза 4). До них он
     видит ровно то, что открыто ему явно: открыть всё «пока временно» значит
     на время сделать его вторым владельцем — тем самым, чего ADR-344 не
     допускает. */
  it('🔴 администратору до переключателей владельца открыто только явное', () => {
    expect(sectionsFor('admin').map((section) => section.href)).toEqual([
      '/admin/leads',
      '/admin/profile',
    ]);
  });

  /* 🔴 Список ролей в `content.ts` выписан руками — иначе клиентская колонка
     панели тянула бы за собой схемы Zod из `entities/staff`. Цена этого —
     возможность разойтись с настоящим перечнем, и платит по ней эта проверка:
     роль, заведённая в схеме и забытая в разделах, не получит даже профиля. */
  it('🔴 профиль открыт ровно тому перечню ролей, который знает схема', () => {
    const withProfile = ADMIN_ROLES.filter((role) =>
      sectionsFor(role).some((section) => section.href === '/admin/profile'),
    );

    expect(withProfile).toEqual([...ADMIN_ROLES]);
  });

  it('свой профиль есть у каждой роли', () => {
    for (const role of ADMIN_ROLES) {
      expect(sectionsFor(role).map((section) => section.href)).toContain('/admin/profile');
    }
  });

  it('🔴 у каждой роли есть русская подпись: роль без неё уедет ключом в карточку', () => {
    for (const role of ADMIN_ROLES) {
      expect(ADMIN_ROLE_TITLES[role]).not.toBe(role);
      expect(ADMIN_ROLE_TITLES[role]).not.toBe('');
    }
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

  /* 🔴 Два рубежа доступа — раскладка панели и сама страница (ADR-095) —
     считают по одному списку. Разойдись они, один окажется мягче другого, и
     мягкий станет настоящим правилом: страница отдаёт данные до того, как
     раскладка успевает что-то решить. */
  it('🔴 «Заявки» стоят в колонке по тому же перечню, которым закрыта страница', () => {
    expect(sectionOf('/admin/leads')?.roles).toBe(CLIENT_CYCLE);
    expect([...CLIENT_CYCLE]).toEqual(['owner', 'admin', 'manager']);
  });

  it('менеджера пускает в заявки и не пускает в разделы про сайт', () => {
    expect(sectionAllows('/admin/leads', 'manager')).toBe(true);
    expect(sectionAllows('/admin/catalog', 'manager')).toBe(false);
    expect(sectionAllows('/admin/catalog/42', 'manager')).toBe(false);
    expect(sectionAllows('/admin/team', 'manager')).toBe(false);
    expect(sectionAllows('/admin', 'manager')).toBe(false);
  });

  it('монтажника в заявки не пускает — ни в сам раздел, ни во вложенное', () => {
    expect(sectionAllows('/admin/leads', 'installer')).toBe(false);
    expect(sectionAllows('/admin/leads/l1/order', 'installer')).toBe(false);
  });

  /* 🔴 Незнакомый адрес проходит намеренно, и это не дыра, а половина
     договорённости: так живёт `/admin/activity` — раздел без пункта в
     колонке, закрытый `requireOwnerPage()` на самой странице. Вторая половина
     договорённости — страж на странице; проверка стоит здесь затем, чтобы
     мягкость этой ветки была видимым решением, а не случайностью. */
  it('🔴 адрес вне колонки раскладка пропускает — закрывает его страница', () => {
    for (const role of ADMIN_ROLES) {
      expect(sectionAllows('/admin/activity', role)).toBe(true);
    }
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
