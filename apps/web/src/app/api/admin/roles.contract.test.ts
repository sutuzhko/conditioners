// @vitest-environment node
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ROLE_LISTS, ROLE_LIST_NAMES, type RoleListName } from '@/entities/staff/access';

/**
 * Контракт ролей: каким перечнем закрыт каждый метод каждого маршрута панели.
 *
 * 🔴 Зачем таблицей, а не тестом на обработчик. Проверка «монтажнику 403»
 * писалась поштучно и там, где о ней вспомнили: у `staff` и `clients` она
 * была, у `leads` стояла только на `POST /leads/{id}/order`, а `GET` того же
 * раздела не проверялся ничем — и именно там разграничение и разъехалось
 * (ADR-149). Ревью обработчиков глазами этот класс дефекта уже пропустило
 * один раз: настройки починили отдельным ADR-143, а соседние разделы
 * остались. Таблица закрывает вопрос целиком и ловит новый раздел,
 * приехавший под чужим стражем по инерции от скопированного соседа.
 *
 * 🔴 Что изменилось с четырьмя ролями (ADR-344). Раньше в таблице стояло
 * `admin` — «любой вошедший». Пока ролей было две, это значило «владелец или
 * монтажник» и читалось как правило. С появлением `admin` и `manager` те же
 * двадцать шесть методов — заказы, склад, календарь, отлучки — открылись двум
 * новым ролям без единой правки маршрута и без строчки в диффе. Поэтому
 * «любой вошедший» перестал существовать как страж: у каждого метода теперь
 * стоит **именованный перечень ролей** из `entities/staff/access`, и роль,
 * которую в нём не назвали, не проходит.
 *
 * 🔴 Проверка идёт по значению обработчика, а не по тексту исходника.
 * `withRoles` оставляет перечень на самой обёрнутой функции, и тест читает
 * `GET.roles` — то, что действительно выполнится. Предыдущая редакция разбирала
 * файл регулярным выражением и знала ровно то, что в нём написано; такой
 * проверке нельзя было доказать, что за именем `withOwner` стоит именно
 * владелец. Сравнение идёт по тождеству (`toBe` на массиве), поэтому маршрут,
 * выписавший себе роли массивом по месту, тест не пройдёт: второй источник
 * правды — ровно то, от чего этот файл и защищает.
 *
 * Поведение — что разрешённой роли отвечают не отказом, а всем остальным 403,
 * и что без сессии приходит 401, — проверяется вызовом каждого метода в
 * `access.test.ts`. Здесь другой вопрос: **каким перечнем закрыт экспорт**.
 *
 * Источник истины для колонки «кому положено» — [CRM §6](../../../../../docs/CRM.md)
 * и [API.md §17](../../../../../docs/API.md).
 */
const EXPECTED: Readonly<Record<string, RoleListName>> = {
  /* Разделы про сайт: каталог, цены, статьи, отзывы, настройки. Всем, кроме
     владельца, закрыты целиком — правка прайса меняет цену на публичной
     витрине тем же запросом, а это красная линия «не врать в цене». */
  'articles GET': 'OWNER',
  'articles POST': 'OWNER',
  'articles/[id] GET': 'OWNER',
  'articles/[id] PUT': 'OWNER',
  'articles/[id] PATCH': 'OWNER',
  'articles/[id] DELETE': 'OWNER',
  'articles/[id]/cover POST': 'OWNER',
  'articles/[id]/cover DELETE': 'OWNER',
  'models GET': 'OWNER',
  'models POST': 'OWNER',
  'models/[id] GET': 'OWNER',
  'models/[id] PUT': 'OWNER',
  'models/[id] PATCH': 'OWNER',
  'models/[id] DELETE': 'OWNER',
  'models/[id]/sale PATCH': 'OWNER',
  'models/[id]/photos POST': 'OWNER',
  'models/[id]/photos/[photoId] PATCH': 'OWNER',
  'models/[id]/photos/[photoId] DELETE': 'OWNER',
  'prices GET': 'OWNER',
  'prices PUT': 'OWNER',
  'reviews GET': 'OWNER',
  'reviews/[id] DELETE': 'OWNER',
  'reviews/[id]/status PATCH': 'OWNER',
  'revalidate POST': 'OWNER',
  'settings GET': 'OWNER',
  'settings/[key] GET': 'OWNER',
  'settings/[key] PUT': 'OWNER',
  'settings/readiness GET': 'OWNER',

  /* Клиенты и команда: персональные данные и деньги — владельческие целиком. */
  'clients GET': 'OWNER',
  'clients POST': 'OWNER',
  'clients/[id] GET': 'OWNER',
  'clients/[id] PATCH': 'OWNER',
  'clients/[id] DELETE': 'OWNER',
  'clients/[id]/units POST': 'OWNER',
  'clients/[id]/units/[unitId] PATCH': 'OWNER',
  'clients/[id]/units/[unitId] DELETE': 'OWNER',
  // снимок техники клиента лежит в закрытом хранилище и отдаётся своим маршрутом (issue #868)
  'clients/[id]/units/[unitId]/photo GET': 'OWNER',
  /* 🔴 Обращения — работа клиентского цикла (ADR-344). Раздел «Заявки» открыт
     владельцу, администратору и менеджеру ещё с фазы 1 (issue #770), а ручки
     оставались владельческими: менеджер видел очередь и получал отказ на
     смене статуса, а на месте фотографии — битую картинку. Читать и вести
     обращение он обязан уметь, иначе открытый ему раздел — экран для чтения. */
  'leads GET': 'CLIENT_CYCLE',
  'leads/[id] GET': 'CLIENT_CYCLE',
  'leads/[id] PATCH': 'CLIENT_CYCLE',
  // снимок при заявке — часть той же карточки, и перечень у него тот же (ADR-171)
  'leads/[id]/photo GET': 'CLIENT_CYCLE',
  /* 🔴 Уничтожение персональных данных обращения (152-ФЗ, issue #600) остаётся
     владельческим: удаление данных — одно из пяти опасных действий, которые
     владелец раздаёт переключателем (ADR-344, фаза 4). */
  'leads/[id] DELETE': 'OWNER',
  /* Заведение клиента и наряда из обращения открывает разделы, закрытые
     менеджеру до фазы 3: пока проекции не прячут вознаграждение исполнителя,
     эти два действия остаются владельческими. */
  'leads/[id]/client POST': 'OWNER',
  'leads/[id]/order POST': 'OWNER',
  'staff GET': 'OWNER',
  'staff POST': 'OWNER',
  'staff/[id] GET': 'OWNER',
  'staff/[id] PATCH': 'OWNER',
  'staff/[id] DELETE': 'OWNER',
  'staff/[id]/notes GET': 'OWNER',
  'staff/[id]/notes POST': 'OWNER',
  'staff/[id]/notes/[noteId] DELETE': 'OWNER',

  /* Уведомления: адресация — владельческая, повтор отказа тоже (он шлёт
     клиенту письмо от имени компании). */
  'notifications/[id]/retry POST': 'OWNER',
  'notifications/recipients/[id] PATCH': 'OWNER',

  /* Календарь. `CrmEvent` не имеет владельца в схеме, поэтому отдать
     монтажнику «только свои дела» нечем — до появления `userId` правка дел
     целиком владельческая (BUGS, «Календарь отдаёт монтажнику все дела»). */
  'crm POST': 'OWNER',
  'crm/[id] PATCH': 'OWNER',
  'crm/[id] DELETE': 'OWNER',
  /* 🔴 Поиск открыт и монтажнику — но находит он только свои наряды: чужие
     дела и обращения его запрос не выбирает вовсе (repo/crm, ADR-114). */
  'crm/search GET': 'FIELD',

  /* Наряды — рабочий экран монтажника. Список и карточку он получает
     отфильтрованными: `viewerWhere` в репозитории, чужой наряд отвечает 404.
     Владельческими остаются заведение, удаление и документы: договор — это
     персональные данные клиента.

     🔴 Менеджера в `FIELD` нет до фазы 3: ответ наряда везёт вознаграждение
     исполнителя и удержания, а `viewerWhere` сужает выборку только
     монтажнику — менеджеру он отдал бы владельческую проекцию целиком. */
  'orders GET': 'FIELD',
  'orders POST': 'OWNER',
  /* Групповое назначение — решение владельца: монтажник, раздающий себе чужие
     выезды, ломает и график, и деньги (CRM §6, issue #596). */
  'orders/assign POST': 'OWNER',
  'orders/[id] GET': 'FIELD',
  'orders/[id] PATCH': 'FIELD',
  'orders/[id] DELETE': 'OWNER',
  'orders/[id]/result PATCH': 'FIELD',
  'orders/[id]/checklist POST': 'FIELD',
  'orders/[id]/checklist PUT': 'FIELD',
  'orders/[id]/checklist/[itemId] PATCH': 'FIELD',
  'orders/[id]/checklist/[itemId] DELETE': 'FIELD',
  'orders/[id]/consumption GET': 'FIELD',
  'orders/[id]/consumption POST': 'FIELD',
  'orders/[id]/consumption/[move] DELETE': 'FIELD',
  'orders/[id]/photos POST': 'FIELD',
  'orders/[id]/photos/[photoId] DELETE': 'FIELD',
  /* Выдача снимка наряда — тот же страж, что у документа: монтажник получает
     файлы только своего наряда, принадлежность проверяет репозиторий. */
  'orders/[id]/photos/[photoId]/file GET': 'FIELD',
  'orders/[id]/docs POST': 'OWNER',
  'orders/[id]/docs/[docId] DELETE': 'OWNER',
  /* 🔴 Выдача файла документа открыта монтажнику, а его загрузка и удаление —
     владельческие. Асимметрия заведена в BUGS отдельной записью; здесь
     зафиксировано текущее поведение, чтобы таблица не выдавала за решённое
     то, чего владелец ещё не решал. */
  'orders/[id]/docs/[docId]/file GET': 'FIELD',

  /* Отлучки монтажника: свои он заводит сам, чужие ему не видны — фильтрует
     `listBlocks(viewer)`. */
  'blocks GET': 'FIELD',
  'blocks POST': 'FIELD',
  'blocks/[id] PATCH': 'FIELD',
  'blocks/[id] DELETE': 'FIELD',

  /* Склад. Монтажник видит остатки и списывает в свой наряд, но справочник
     позиций и зон правит владелец. */
  'stock GET': 'FIELD',
  'stock/movements GET': 'OWNER',
  'stock/movements POST': 'FIELD',
  'stock/zones GET': 'FIELD',
  'stock/zones POST': 'OWNER',
  'stock/zones/[id] PATCH': 'OWNER',
  'stock/zones/[id] DELETE': 'OWNER',
  'stock/items POST': 'OWNER',
  'stock/items/[id] GET': 'OWNER',
  'stock/items/[id] PATCH': 'OWNER',
  'stock/items/[id] DELETE': 'OWNER',

  /* Свой профиль и свой пароль есть у каждого, кто вошёл. Именно «у каждого
     перечисленного», а не «у всякого с сессией»: перечень закрытый, и
     следующая заведённая роль попадёт сюда правкой `EVERYONE`, а не молча. */
  'profile GET': 'EVERYONE',
  'profile PATCH': 'EVERYONE',
  'profile/password POST': 'EVERYONE',
  /* Выход на всех устройствах нужен всем ролям: у монтажника телефон
     теряется чаще, чем у владельца ноутбук (ADR-313). */
  'profile/sessions DELETE': 'EVERYONE',
};

const ADMIN_API_DIR = fileURLToPath(new URL('.', import.meta.url));

/**
 * 🔴 Обход дерева маршрутов файловой системой — та половина проверки, ради
 * которой она и написана: маршрут появляется в проекте как файл `route.ts`, и
 * никакого перечня, куда его надо было бы вписать, в Next не существует.
 * Поэтому «что вообще есть» спрашивают у каталога, а не у списка импортов.
 */
function routeFiles(dir: string, prefix = ''): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const nested = join(dir, entry.name);
    if (entry.isDirectory()) {
      return routeFiles(nested, prefix === '' ? entry.name : `${prefix}/${entry.name}`);
    }
    return entry.name === 'route.ts' ? [prefix] : [];
  });
}

/**
 * `import.meta.glob` — приём Vite: шаблон разворачивается в список модулей на
 * этапе преобразования файла, по тому же каталогу. Тип объявляется здесь, а не
 * подключением `vite/client`: тот тянет за собой объявления модулей для CSS и
 * картинок, а они уже описаны в `next-env.d.ts`.
 */
declare global {
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<Record<string, unknown>>>;
  }
}

const MODULES = import.meta.glob('./**/route.ts');

const METHODS: readonly string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** Что стоит на месте перечня, когда его нет или он безымянный. */
type Missing = 'без перечня ролей' | 'перечень не из entities/staff/access';

/** Имя перечня, тождественного этому массиву ролей. */
function listNameOf(roles: unknown): RoleListName | Missing {
  return (
    ROLE_LIST_NAMES.find((name) => ROLE_LISTS[name] === roles) ??
    'перечень не из entities/staff/access'
  );
}

async function guardsOf(
  routePath: string,
): Promise<Readonly<Record<string, RoleListName | Missing>>> {
  const load = MODULES[`./${routePath}/route.ts`];
  if (load === undefined) return {};

  const loaded = await load();
  const entries = METHODS.flatMap((method) => {
    const handler = loaded[method];
    if (typeof handler !== 'function') return [];

    const roles = 'roles' in handler ? handler.roles : undefined;
    const name: RoleListName | Missing =
      roles === undefined ? 'без перечня ролей' : listNameOf(roles);

    return [[`${routePath} ${method}`, name] as const];
  });

  return Object.fromEntries(entries);
}

const tree = routeFiles(ADMIN_API_DIR);
const actual: Record<string, RoleListName | Missing> = {};
for (const path of tree) Object.assign(actual, await guardsOf(path));

describe('контракт ролей: /api/admin/**', () => {
  /* 🔴 Ни один файл дерева не должен потеряться по дороге: таблица сверяется с
     тем, что действительно загрузилось, и обход каталога здесь — независимый
     свидетель. Пропусти шаблон один маршрут — все остальные проверки остались
     бы зелёными, ничего про него не сказав. */
  it('🔴 каждый файл маршрута из дерева каталогов попал в проверку', () => {
    const loaded = Object.keys(MODULES).map((key) =>
      key.replace(/^\.\//, '').replace(/\/route\.ts$/, ''),
    );

    expect([...loaded].sort()).toEqual([...tree].sort());
  });

  it('🔴 у каждого метода панели тот перечень ролей, который положен ему по CRM §6', () => {
    /* Сравниваем целиком, а не по одному ключу: так падение показывает разом
       все разъехавшиеся маршруты, а не первый попавшийся. */
    expect(actual).toEqual(EXPECTED);
  });

  it('🔴 ни один метод панели не остался вовсе без перечня ролей', () => {
    const unguarded = Object.entries(actual)
      .filter(([, name]) => name === 'без перечня ролей')
      .map(([route]) => route);

    expect(unguarded).toEqual([]);
  });

  /* 🔴 Перечень обязан быть именованным. Маршрут, выписавший роли массивом по
     месту, работает правильно ровно до первой правки матрицы: она пройдёт по
     `entities/staff/access` и его не заденет. */
  it('🔴 ни один маршрут не выписывает роли массивом по месту', () => {
    const inline = Object.entries(actual)
      .filter(([, name]) => name === 'перечень не из entities/staff/access')
      .map(([route]) => route);

    expect(inline).toEqual([]);
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
