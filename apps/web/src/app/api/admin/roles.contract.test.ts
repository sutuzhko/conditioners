// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Контракт ролей: какой минимальной ролью закрыт каждый метод каждого
 * маршрута панели.
 *
 * 🔴 Зачем таблицей, а не тестом на обработчик. Проверка «монтажнику 403»
 * писалась поштучно и там, где о ней вспомнили: у `staff` и `clients` она
 * есть, у `leads` стоит только на `POST /leads/{id}/order`, а `GET` того же
 * раздела не проверен ничем — и именно там разграничение и разъехалось
 * (BUGS, «Монтажник читает всю базу обращений»). Ревью обработчиков глазами
 * этот класс дефекта уже пропустило один раз: настройки починили отдельным
 * ADR-143, а соседние разделы остались. Таблица закрывает вопрос целиком и,
 * что важнее, ловит новый раздел, приехавший под `withAdmin` по инерции:
 * маршрут, которого нет в таблице, роняет тест.
 *
 * Проверка идёт по исходнику, а не вызовом обработчика, сознательно. Вызвать
 * метод под сессией монтажника можно только у владельческих маршрутов —
 * `withOwner` отбивает запрос до обработчика. У общих маршрутов обработчик
 * начал бы работать и полез бы в базу, так что «не 403» пришлось бы
 * доказывать подменой полусотни репозиториев. Здесь проверяется ровно то,
 * что и должно: каким стражем обёрнут экспорт.
 *
 * Поведение самих стражей — что `withOwner` отвечает 403, а `withAdmin` без
 * сессии отвечает 401 — проверено отдельно в `staff/route.test.ts` и
 * `clients/route.test.ts`. Дублировать его здесь незачем.
 *
 * Источник истины для колонки «кому положено» — [CRM §6](../../../../../docs/CRM.md):
 * «Клиенты, монтажники, обращения — нет доступа», «Разделы про сайт — нет
 * доступа». Всё остальное монтажнику нужно по работе, и там его ограничивает
 * не страж, а проекция под роль в репозитории (`viewerWhere`).
 */

type Role = 'admin' | 'owner';

/**
 * `admin` — любой вошедший в панель; доступ к чужому ограничивает репозиторий.
 * `owner` — только владелец.
 *
 * Ключ — путь маршрута от `api/admin` и метод.
 */
const EXPECTED: Readonly<Record<string, Role>> = {
  /* Разделы про сайт: каталог, цены, статьи, отзывы, настройки. Монтажнику
     закрыты целиком — правка прайса меняет цену на публичной витрине тем же
     запросом, а это красная линия «не врать в цене». */
  'articles GET': 'owner',
  'articles POST': 'owner',
  'articles/[id] GET': 'owner',
  'articles/[id] PUT': 'owner',
  'articles/[id] PATCH': 'owner',
  'articles/[id] DELETE': 'owner',
  'articles/[id]/cover POST': 'owner',
  'articles/[id]/cover DELETE': 'owner',
  'models GET': 'owner',
  'models POST': 'owner',
  'models/[id] GET': 'owner',
  'models/[id] PUT': 'owner',
  'models/[id] PATCH': 'owner',
  'models/[id] DELETE': 'owner',
  'models/[id]/sale PATCH': 'owner',
  'models/[id]/photos POST': 'owner',
  'models/[id]/photos/[photoId] PATCH': 'owner',
  'models/[id]/photos/[photoId] DELETE': 'owner',
  'prices GET': 'owner',
  'prices PUT': 'owner',
  'reviews GET': 'owner',
  'reviews/[id] DELETE': 'owner',
  'reviews/[id]/status PATCH': 'owner',
  'revalidate POST': 'owner',
  'settings GET': 'owner',
  'settings/[key] GET': 'owner',
  'settings/[key] PUT': 'owner',
  'settings/readiness GET': 'owner',

  /* Клиенты, команда, обращения: персональные данные и деньги. */
  'clients GET': 'owner',
  'clients POST': 'owner',
  'clients/[id] GET': 'owner',
  'clients/[id] PATCH': 'owner',
  'clients/[id] DELETE': 'owner',
  'clients/[id]/units POST': 'owner',
  'clients/[id]/units/[unitId] PATCH': 'owner',
  'clients/[id]/units/[unitId] DELETE': 'owner',
  'leads GET': 'owner',
  'leads/[id] GET': 'owner',
  'leads/[id] PATCH': 'owner',
  'leads/[id]/client POST': 'owner',
  'leads/[id]/order POST': 'owner',
  // снимок при заявке — персональные данные клиента, как и сама заявка (ADR-171)
  'leads/[id]/photo GET': 'owner',
  'staff GET': 'owner',
  'staff POST': 'owner',
  'staff/[id] GET': 'owner',
  'staff/[id] PATCH': 'owner',
  'staff/[id] DELETE': 'owner',
  'staff/[id]/notes GET': 'owner',
  'staff/[id]/notes POST': 'owner',
  'staff/[id]/notes/[noteId] DELETE': 'owner',

  /* Уведомления: адресация — владельческая, повтор отказа тоже (он шлёт
     клиенту письмо от имени компании). */
  'notifications/[id]/retry POST': 'owner',
  'notifications/recipients/[id] PATCH': 'owner',

  /* Календарь. `CrmEvent` не имеет владельца в схеме, поэтому отдать
     монтажнику «только свои дела» нечем — до появления `userId` раздел
     целиком владельческий (BUGS, «Календарь отдаёт монтажнику все дела»). */
  'crm POST': 'owner',
  'crm/[id] PATCH': 'owner',
  'crm/[id] DELETE': 'owner',
  /* 🔴 Поиск открыт и монтажнику — но находит он только свои наряды: чужие
     дела и обращения его запрос не выбирает вовсе (repo/crm, ADR-114). */
  'crm/search GET': 'admin',

  /* Наряды — рабочий экран монтажника. Список и карточку он получает
     отфильтрованными: `viewerWhere` в репозитории, чужой наряд отвечает 404.
     Владельческими остаются заведение, удаление и документы: договор — это
     персональные данные клиента. */
  'orders GET': 'admin',
  'orders POST': 'owner',
  /* Групповое назначение — решение владельца: монтажник, раздающий себе чужие
     выезды, ломает и график, и деньги (CRM §6, issue #596). */
  'orders/assign POST': 'owner',
  'orders/[id] GET': 'admin',
  'orders/[id] PATCH': 'admin',
  'orders/[id] DELETE': 'owner',
  'orders/[id]/result PATCH': 'admin',
  'orders/[id]/checklist POST': 'admin',
  'orders/[id]/checklist PUT': 'admin',
  'orders/[id]/checklist/[itemId] PATCH': 'admin',
  'orders/[id]/checklist/[itemId] DELETE': 'admin',
  'orders/[id]/consumption GET': 'admin',
  'orders/[id]/consumption POST': 'admin',
  'orders/[id]/consumption/[move] DELETE': 'admin',
  'orders/[id]/photos POST': 'admin',
  'orders/[id]/photos/[photoId] DELETE': 'admin',
  /* Выдача снимка наряда — тот же страж, что у документа: монтажник получает
     файлы только своего наряда, принадлежность проверяет репозиторий. */
  'orders/[id]/photos/[photoId]/file GET': 'admin',
  'orders/[id]/docs POST': 'owner',
  'orders/[id]/docs/[docId] DELETE': 'owner',
  /* 🔴 Выдача файла документа общая, а его загрузка и удаление —
     владельческие. Асимметрия заведена в BUGS отдельной записью; здесь
     зафиксировано текущее поведение, чтобы таблица не выдавала решение,
     которого владелец ещё не принял. */
  'orders/[id]/docs/[docId]/file GET': 'admin',

  /* Отлучки монтажника: свои он заводит сам, чужие ему не видны — фильтрует
     `listBlocks(viewer)`. */
  'blocks GET': 'admin',
  'blocks POST': 'admin',
  'blocks/[id] PATCH': 'admin',
  'blocks/[id] DELETE': 'admin',

  /* Склад. Монтажник видит остатки и списывает в свой наряд, но справочник
     позиций и зон правит владелец. */
  'stock GET': 'admin',
  'stock/movements GET': 'owner',
  'stock/movements POST': 'admin',
  'stock/zones GET': 'admin',
  'stock/zones POST': 'owner',
  'stock/zones/[id] PATCH': 'owner',
  'stock/zones/[id] DELETE': 'owner',
  'stock/items POST': 'owner',
  'stock/items/[id] GET': 'owner',
  'stock/items/[id] PATCH': 'owner',
  'stock/items/[id] DELETE': 'owner',

  /* Свой профиль и свой пароль есть у каждого, кто вошёл. */
  'profile GET': 'admin',
  'profile PATCH': 'admin',
  'profile/password POST': 'admin',
};

const ADMIN_API_DIR = fileURLToPath(new URL('.', import.meta.url));

function routeFiles(dir: string, prefix = ''): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const nested = join(dir, entry.name);
    if (entry.isDirectory()) {
      return routeFiles(nested, prefix === '' ? entry.name : `${prefix}/${entry.name}`);
    }
    return entry.name === 'route.ts' ? [prefix] : [];
  });
}

/** `export const PATCH = withOwner(` → `{ 'путь PATCH': 'owner' }`. */
function guardsOf(routePath: string): Readonly<Record<string, Role | 'без стража'>> {
  const source = readFileSync(join(ADMIN_API_DIR, routePath, 'route.ts'), 'utf8');
  const methods = source.matchAll(/^export const (GET|POST|PUT|PATCH|DELETE) = (\w+)\(/gm);

  return Object.fromEntries(
    [...methods].map(([, method, guard]) => {
      const role = guard === 'withOwner' ? 'owner' : guard === 'withAdmin' ? 'admin' : 'без стража';
      return [`${routePath} ${method}`, role];
    }),
  );
}

const actual: Record<string, Role | 'без стража'> = {};
for (const path of routeFiles(ADMIN_API_DIR)) Object.assign(actual, guardsOf(path));

describe('контракт ролей: /api/admin/**', () => {
  it('🔴 у каждого метода панели тот страж, который положен ему по CRM §6', () => {
    /* Сравниваем целиком, а не по одному ключу: так падение показывает разом
       все разъехавшиеся маршруты, а не первый попавшийся. */
    expect(actual).toEqual(EXPECTED);
  });

  it('🔴 ни один метод панели не остался вовсе без стража', () => {
    const unguarded = Object.entries(actual)
      .filter(([, role]) => role === 'без стража')
      .map(([route]) => route);

    expect(unguarded).toEqual([]);
  });

  it('новый маршрут панели обязан появиться в таблице ролей', () => {
    /* Ловушка на инерцию: раздел, скопированный с соседнего, приезжает под
       тем же стражем, что и образец, и это остаётся незамеченным до ревью. */
    const missing = Object.keys(actual).filter((route) => !(route in EXPECTED));

    expect(missing).toEqual([]);
  });

  it('таблица не описывает маршрутов, которых больше нет', () => {
    const stale = Object.keys(EXPECTED).filter((route) => !(route in actual));

    expect(stale).toEqual([]);
  });
});
