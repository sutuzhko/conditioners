// @vitest-environment node
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ROLE_LISTS, ROLE_LIST_NAMES, type RoleListName } from '@/entities/staff/access';
import {
  ADMIN_PERMISSIONS,
  DANGEROUS_PERMISSIONS,
  PANEL_SECTION_PERMISSIONS,
  type AdminPermission,
} from '@/entities/staff/permissions';
import { apiPermissionRule, type PermissionRule } from '@/server/permissions';
import { ADMIN_SECTIONS } from '@/widgets/admin-shell';

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
  /* 🔴 Роли и разрешения раздаёт только владелец, и никакой переключатель
     этого не открывает (ADR-344, issue #784). Карточку сотрудника при этом
     правит и администратор с «Управлением людьми» — потому раздача прав и
     живёт отдельным адресом, а не полем в общем теле. */
  'staff/[id]/access PATCH': 'OWNER',

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

/* ---------- Контракт разрешений: чего маршрут требует от администратора ----------

   🔴 Вторая половина контракта доступа (ADR-344, issue #783). Перечень ролей
   отвечает на вопрос «какая роль проходит», и для администратора он не
   отвечает ни на что: ADR-344 даёт ему права владельца **под
   переключателями**, то есть решает за него центральная карта
   `server/permissions.ts`. Карта закрыта: адрес, которого в ней нет,
   администратору не открывается — и эта проверка ловит такой адрес прогоном,
   а не отказом у владельца. */

/** Адрес-образец маршрута: `staff/[id]/notes` → `/api/admin/staff/x/notes`. */
function sampleUrlOf(route: string): string {
  const path = route
    .split('/')
    .map((segment) => (segment.startsWith('[') ? 'x' : segment))
    .join('/');

  return `/api/admin/${path}`;
}

function ruleOf(key: string): PermissionRule | null {
  const [route = '', method = ''] = key.split(' ');
  return apiPermissionRule(sampleUrlOf(route), method);
}

/** Как правило читается в таблице: «раздел + опасные действия» или слово. */
function ruleTitleOf(rule: PermissionRule | null): string {
  if (rule === null) return 'нет в карте разрешений';
  if (rule.kind === 'always') return 'открыт всегда';
  if (rule.kind === 'owner') return 'только владелец';

  return rule.required.join(' + ');
}

/**
 * Что требуется администратору у каждого метода панели — полная таблица.
 *
 * 🔴 Полная, а не «только особые случаи», и это не педантизм. Карта разрешений
 * выдаёт правило по первому сегменту адреса, поэтому **новый раздел** без
 * строки в ней она закрывает сама, а **новый метод внутри известного раздела**
 * — нет: `DELETE /api/admin/prices` или `POST /api/admin/staff/{id}/impersonate`
 * молча получили бы разрешение раздела, и ни одна проверка бы не покраснела.
 * Ровно этим механизмом и появился первый дефект фазы: карта открыла
 * администратору `PATCH /staff/{id}`, а защита учётной записи владельца за ней
 * не поехала.
 *
 * Поэтому таблица собрана тем же приёмом, что таблица ролей выше: перечислен
 * каждый метод, и новый обязан быть **назван человеком**, а не унаследовать
 * правило соседа по инерции.
 *
 * Читается так: список разрешений — все нужны разом; «открыт всегда» —
 * переключателем не закрывается; «только владелец» — не открывается никаким
 * переключателем.
 */
const EXPECTED_PERMISSIONS: Readonly<Record<string, string>> = {
  /* Сайт: витрина, статьи, отзывы. Удаление записи требует «Удаления данных»;
     всё, что задаёт цену на витрине, — «Денег». */
  'articles GET': 'knowledge',
  'articles POST': 'knowledge',
  'articles/[id] GET': 'knowledge',
  'articles/[id] PUT': 'knowledge',
  'articles/[id] PATCH': 'knowledge',
  'articles/[id] DELETE': 'knowledge + data_delete',
  'articles/[id]/cover POST': 'knowledge',
  'articles/[id]/cover DELETE': 'knowledge',
  'models GET': 'catalog',
  /* 🔴 Заведение и правка модели везут `priceNum` — цену на публичной
     витрине, ту самую, которую перечёркивает скидка. Закрыть скидку и
     оставить открытой исходную цену значит закрыть половину замка. */
  'models POST': 'catalog + money',
  'models/[id] GET': 'catalog',
  'models/[id] PUT': 'catalog + money',
  'models/[id] PATCH': 'catalog + money',
  'models/[id] DELETE': 'catalog + data_delete',
  'models/[id]/sale PATCH': 'catalog + money',
  'models/[id]/photos POST': 'catalog',
  'models/[id]/photos/[photoId] PATCH': 'catalog',
  'models/[id]/photos/[photoId] DELETE': 'catalog',
  'prices GET': 'prices',
  'prices PUT': 'prices + money',
  'reviews GET': 'reviews',
  'reviews/[id]/status PATCH': 'reviews',
  'reviews/[id] DELETE': 'reviews + data_delete',
  /* Ручная ревалидация принимает произвольный список адресов сайта, а не
     адреса одного раздела: привязать её к разделу нечем. */
  'revalidate POST': 'только владелец',

  /* Настройки. Чтение — раздел «Компания», запись — плюс опасное действие;
     готовность сайта считается для «Обзора» и лежит под его разрешением. */
  'settings GET': 'company',
  'settings/[key] GET': 'company',
  'settings/[key] PUT': 'company + company_settings',
  'settings/readiness GET': 'overview',

  /* Клиенты и обращения. */
  'clients GET': 'clients',
  'clients POST': 'clients',
  'clients/[id] GET': 'clients',
  'clients/[id] PATCH': 'clients',
  'clients/[id] DELETE': 'clients + data_delete',
  'clients/[id]/units POST': 'clients',
  'clients/[id]/units/[unitId] PATCH': 'clients',
  'clients/[id]/units/[unitId] DELETE': 'clients',
  'clients/[id]/units/[unitId]/photo GET': 'clients',
  'leads GET': 'leads',
  'leads/[id] GET': 'leads',
  'leads/[id] PATCH': 'leads',
  'leads/[id]/photo GET': 'leads',
  'leads/[id] DELETE': 'leads + data_delete',
  /* 🔴 Обе ручки заводят записи чужого раздела, и «Заявок» им мало: заведение
     клиента при совпадении телефона возвращает уже заведённую карточку со всей
     историей, то есть отдаёт содержимое закрытого раздела. */
  'leads/[id]/client POST': 'leads + clients',
  'leads/[id]/order POST': 'leads + clients + orders',

  /* Сотрудники. Читает список тот, кому открыт раздел; заводит, правит и
     удаляет — тот, кому открыто «Управление людьми». */
  'staff GET': 'team',
  'staff POST': 'team + people',
  'staff/[id] GET': 'team',
  'staff/[id] PATCH': 'team + people',
  'staff/[id] DELETE': 'team + people + data_delete',
  'staff/[id]/notes GET': 'team',
  'staff/[id]/notes POST': 'team + people',
  'staff/[id]/notes/[noteId] DELETE': 'team + people',
  /* 🔴 Раздачу прав не открывает ни один переключатель: администратор,
     правящий права, означает ровно то, что переключатели владельца —
     договорённость (ADR-344). */
  'staff/[id]/access PATCH': 'только владелец',

  /* Уведомления. */
  'notifications/[id]/retry POST': 'notifications',
  'notifications/recipients/[id] PATCH': 'notifications',

  /* Календарь и отлучки. Отлучка «Удаления данных» не требует: свою человек
     снимает каждый день, и переключатель под это выдавали бы всем. */
  'crm POST': 'crm',
  'crm/[id] PATCH': 'crm',
  'crm/[id] DELETE': 'crm + data_delete',
  'crm/search GET': 'crm',
  'blocks GET': 'crm',
  'blocks POST': 'crm',
  'blocks/[id] PATCH': 'crm',
  'blocks/[id] DELETE': 'crm',

  /* Наряды. Документы наряда — персональные данные клиента, и роль их держит
     владельческими; администратору их открывает разрешение на раздел, как и
     всё остальное, что есть у владельца. */
  'orders GET': 'orders',
  'orders POST': 'orders',
  'orders/assign POST': 'orders',
  'orders/[id] GET': 'orders',
  'orders/[id] PATCH': 'orders',
  'orders/[id] DELETE': 'orders + data_delete',
  'orders/[id]/result PATCH': 'orders',
  'orders/[id]/checklist POST': 'orders',
  'orders/[id]/checklist PUT': 'orders',
  'orders/[id]/checklist/[itemId] PATCH': 'orders',
  'orders/[id]/checklist/[itemId] DELETE': 'orders',
  'orders/[id]/consumption GET': 'orders',
  'orders/[id]/consumption POST': 'orders',
  'orders/[id]/consumption/[move] DELETE': 'orders',
  'orders/[id]/photos POST': 'orders',
  'orders/[id]/photos/[photoId] DELETE': 'orders',
  'orders/[id]/photos/[photoId]/file GET': 'orders',
  'orders/[id]/docs POST': 'orders',
  'orders/[id]/docs/[docId] DELETE': 'orders',
  'orders/[id]/docs/[docId]/file GET': 'orders',

  /* Склад. Закупочная цена — деньги; удаление позиции и зоны — удаление
     данных; списание в свой наряд остаётся дневной работой. */
  'stock GET': 'stock',
  'stock/movements GET': 'stock',
  'stock/movements POST': 'stock',
  'stock/zones GET': 'stock',
  'stock/zones POST': 'stock',
  'stock/zones/[id] PATCH': 'stock',
  'stock/zones/[id] DELETE': 'stock + data_delete',
  'stock/items POST': 'stock + money',
  'stock/items/[id] GET': 'stock',
  'stock/items/[id] PATCH': 'stock + money',
  'stock/items/[id] DELETE': 'stock + data_delete',

  /* Свой профиль переключателем не закрывается. */
  'profile GET': 'открыт всегда',
  'profile PATCH': 'открыт всегда',
  'profile/password POST': 'открыт всегда',
  'profile/sessions DELETE': 'открыт всегда',
};

describe('контракт разрешений: /api/admin/**', () => {
  it('🔴 у каждого метода панели то разрешение, которое ему положено', () => {
    /* Сравниваем целиком: так падение показывает разом все разъехавшиеся
       методы, а новый метод виден как лишний ключ, а не как пустое место. */
    const resolved = Object.fromEntries(
      Object.keys(actual).map((key) => [key, ruleTitleOf(ruleOf(key))]),
    );

    expect(resolved).toEqual(EXPECTED_PERMISSIONS);
  });

  it('🔴 ни один метод панели не остался вне карты разрешений', () => {
    const uncovered = Object.keys(actual).filter((key) => ruleOf(key) === null);

    expect(uncovered).toEqual([]);
  });

  /* 🔴 Ловушка на новый метод внутри известного раздела. Карта выдаёт правило
     по первому сегменту адреса, и такой метод получил бы разрешение раздела
     молча: `uncovered` остался бы пуст. Здесь он виден как ключ, которого нет
     в таблице, — и автор обязан назвать его требование сам. */
  it('🔴 новый метод панели обязан появиться в таблице разрешений', () => {
    const unnamed = Object.keys(actual).filter((key) => !(key in EXPECTED_PERMISSIONS));

    expect(unnamed).toEqual([]);
  });

  it('таблица разрешений не описывает методов, которых больше нет', () => {
    const stale = Object.keys(EXPECTED_PERMISSIONS).filter((key) => !(key in actual));

    expect(stale).toEqual([]);
  });

  /* Разрешение, которого не требует ни один адрес, — переключатель, который
     ничего не выключает: владелец его снимет и ничего не заметит. */
  it('каждое разрешение раздела закрывает хотя бы одну ручку или страницу', () => {
    const used = new Set<AdminPermission>();
    for (const key of Object.keys(actual)) {
      const rule = ruleOf(key);
      if (rule !== null && rule.kind === 'permissions') {
        for (const permission of rule.required) used.add(permission);
      }
    }

    const unused = ADMIN_PERMISSIONS.filter((permission) => !used.has(permission));

    /* «Обзор» и «Журнал» своих ручек не имеют: сводка собирается серверными
       компонентами страницы, а чистки журнала в коде ещё нет (Журнал · Фаза 2).
       Обе закрыты страницами — см. server/permissions.pages.test.ts. */
    expect(unused).toEqual(['activity_purge']);
  });

  it('🔴 тринадцать разрешений разделов — это разделы колонки панели', () => {
    /* 🔴 Сверка, а не импорт: `entities` не имеет права знать про `widgets`
       (правило слоёв), поэтому список разделов выписан в словаре разрешений
       значениями. Разъехаться им не даёт эта проверка. */
    const nav = ADMIN_SECTIONS.filter(
      (section) => section.href !== '/admin/settings' && section.href !== '/admin/profile',
    ).map((section) => section.href.replace('/admin/', '').replace('/admin', 'overview'));

    expect([...PANEL_SECTION_PERMISSIONS].sort()).toEqual([...nav].sort());
  });

  it('разделов тринадцать, опасных действий пять', () => {
    expect({
      разделов: PANEL_SECTION_PERMISSIONS.length,
      опасных: DANGEROUS_PERMISSIONS.length,
    }).toEqual({ разделов: 13, опасных: 5 });
  });
});
