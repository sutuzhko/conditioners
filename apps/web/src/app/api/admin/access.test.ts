// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_ROLES, type AdminRole } from '@/entities/staff/model';
import { ADMIN_PERMISSIONS, type AdminPermission } from '@/entities/staff/permissions';
import type * as AuthModuleTypes from '@/server/auth';

/**
 * Доступ по ролям — вызовом каждого метода панели, а не чтением обёртки.
 *
 * 🔴 Зачем это сверх контрактной таблицы (`roles.contract.test.ts`). Таблица
 * отвечает на вопрос «каким перечнем закрыт экспорт» и ничего не говорит о
 * том, что перечень **исполняется**: страж, разбирающий роль в обход своего
 * списка, прошёл бы её насквозь. Здесь спрашивают сам обработчик: под сессией
 * каждой из четырёх ролей, у каждого метода каждого маршрута.
 *
 * 🔴 Почему ADR-149 отказался это делать и почему теперь можно. Тогда довод
 * был такой: у общих маршрутов обработчик начнёт работать и полезет в базу,
 * так что «не 403» пришлось бы доказывать подменой полусотни репозиториев.
 * Довод снят одной подменой — `@/server/db`: обработчик, дошедший до базы,
 * получает исключение и превращается в 500, а нам ровно это и нужно. Проверка
 * идёт не по коду ответа, а по **тексту отказа**: у стража он свой
 * (`ROLE_REFUSAL`), и никакой отказ из бизнес-логики — «наряд не ваш», «зона
 * чужая» — с ним не спутается. Иначе тест краснел бы на честном 403.
 *
 * 🔴 Подмена `@/server/repo/admin-users` пустым модулем нужна не маршрутам, а
 * разрыву цикла импортов: `auth` тянет `repo/admin-users`, тот — `http` ради
 * `ApiException`, а `http` — обратно `auth`. На полпути круга `http` получает
 * настоящий `getAdminSession` мимо подмены, и проверка доступа уходит в
 * `cookies()` вне запроса (ADR-149). Без этой строки падает весь файл.
 */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

vi.mock('@/server/repo/admin-users', () => ({}));

/**
 * База в этом прогоне не поднята намеренно: проверяется рубеж доступа, а не
 * работа обработчика. Любое обращение к ней — исключение, которое обёртка
 * маршрута превращает в 500.
 */
vi.mock('@/server/db', () => {
  const table = new Proxy(
    {},
    {
      get: () => () => {
        throw new Error('база в проверке доступа не поднята — это ожидаемо');
      },
    },
  );

  return { db: new Proxy({}, { get: () => table }) };
});

import { getAdminSession } from '@/server/auth';
import { ROLE_REFUSAL, rolesOf } from '@/server/http';
import { apiPermissionRule, rulePasses } from '@/server/permissions';

/**
 * `import.meta.glob` — приём Vite: шаблон разворачивается в список модулей на
 * этапе преобразования файла, по тому же каталогу. Новый `route.ts` попадает в
 * перебор сам, без правки этого файла.
 */
declare global {
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<Record<string, unknown>>>;
  }
}

const MODULES = import.meta.glob('./**/route.ts');

const METHODS: readonly string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

type RouteExport = (request: NextRequest, context: unknown) => Promise<Response>;

/** Экспорт маршрута — функция; всё остальное в модуле нас не касается. */
function isRouteExport(value: unknown): value is RouteExport {
  return typeof value === 'function';
}

type Method = {
  readonly name: string;
  readonly handler: RouteExport;
  readonly roles: readonly AdminRole[] | null;
};

async function methodsOfPanel(): Promise<readonly Method[]> {
  const found: Method[] = [];

  for (const [key, load] of Object.entries(MODULES)) {
    const loaded = await load();
    const route = key.replace(/^\.\//, '').replace(/\/route\.ts$/, '');

    for (const method of METHODS) {
      const handler = loaded[method];
      if (!isRouteExport(handler)) continue;

      found.push({ name: `${route} ${method}`, handler, roles: rolesOf(handler) });
    }
  }

  return found;
}

const PANEL_METHODS = await methodsOfPanel();

/**
 * Значения сегментов адреса. Обработчику они безразличны: до чтения данных он
 * не доходит ни в одной из проверок этого файла — либо отказ стража, либо
 * исключение подменённой базы.
 */
function contextOf(): unknown {
  return {
    params: Promise.resolve({
      id: 'x',
      key: 'contacts',
      unitId: 'x',
      photoId: 'x',
      docId: 'x',
      itemId: 'x',
      noteId: 'x',
      move: 'x',
    }),
  };
}

/**
 * Адрес маршрута — настоящий, а не заглушка.
 *
 * 🔴 Раньше здесь стоял один адрес на все маршруты, и этого хватало: страж
 * читал только перечень ролей. Разрешения администратора карта выдаёт **по
 * адресу** (ADR-344, issue #783), и общая заглушка означала бы, что проверка
 * доступа спрашивает не про тот маршрут, который вызывает.
 */
function urlOf(route: string): string {
  const path = route
    .split('/')
    .map((segment) => (segment.startsWith('[') ? 'x' : segment))
    .join('/');

  return `https://tulaklimat.ru/api/admin/${path}`;
}

function requestOf(name: string): NextRequest {
  const [route = '', method = 'GET'] = name.split(' ');

  /* Без заголовка `Origin`: проверка кросс-сайтовости отвечает 403 раньше
     стража ролей и подменила бы собой предмет проверки. */
  return new NextRequest(urlOf(route), { method });
}

/**
 * Кому метод обязан отказать.
 *
 * 🔴 У администратора спрашивается не перечень ролей, а карта разрешений: он —
 * владелец под переключателями (ADR-344), и перечень про него не отвечает.
 * У остальных трёх ролей всё как было.
 */
function refusalExpected(
  method: Method,
  role: AdminRole,
  permissions: readonly AdminPermission[],
): boolean {
  const [route = '', verb = 'GET'] = method.name.split(' ');

  if (role === 'admin') {
    return !rulePasses(apiPermissionRule(new URL(urlOf(route)).pathname, verb), permissions);
  }

  return method.roles !== null && !method.roles.includes(role);
}

/** Текст ошибки из конверта ответа — по нему отличается отказ стража. */
function messageOf(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('error' in body)) return '';

  const error: unknown = body.error;
  if (typeof error !== 'object' || error === null || !('message' in error)) return '';

  return typeof error.message === 'string' ? error.message : '';
}

async function refusedByGuard(response: Response): Promise<boolean> {
  if (response.status !== 403) return false;

  const body: unknown = await response.json().catch(() => null);
  return messageOf(body) === ROLE_REFUSAL;
}

const SESSION: Readonly<Record<AdminRole, AuthModuleTypes.AdminSession>> = {
  owner: {
    userId: 'u1',
    login: 'admin',
    name: null,
    role: 'owner',
    expiresAt: new Date('2030-01-01'),
  },
  admin: {
    userId: 'u2',
    login: 'ivanova',
    name: null,
    role: 'admin',
    /* Владелец выдал всё: проверяется, что карта не открывает лишнего даже
       обладателю полного набора — владельческие адреса ему всё равно закрыты. */
    permissions: ADMIN_PERMISSIONS,
    expiresAt: new Date('2030-01-01'),
  },
  manager: {
    userId: 'u3',
    login: 'lebedeva',
    name: null,
    role: 'manager',
    expiresAt: new Date('2030-01-01'),
  },
  installer: {
    userId: 'u4',
    login: 'sokolov',
    name: null,
    role: 'installer',
    expiresAt: new Date('2030-01-01'),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  /* Обработчик, дошедший до подменённой базы, пишет ошибку в лог — здесь это
     ожидаемый ход событий, а не происшествие. */
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('доступ по ролям: /api/admin/**', () => {
  it('🔴 в панели есть маршруты и у каждого метода известен перечень ролей', () => {
    const nameless = PANEL_METHODS.filter((method) => method.roles === null).map(
      (method) => method.name,
    );

    expect({ count: PANEL_METHODS.length > 0, nameless }).toEqual({ count: true, nameless: [] });
  });

  /* 🔴 Перебор идёт по всем четырём ролям, а не по «монтажнику как чужому».
     Роль, которую забыли внести в перечень, обязана получать отказ — иначе
     следующая заведённая роль въедет в чужой раздел молча (ADR-344). */
  it.each(ADMIN_ROLES)(
    'роль %s: отказ ровно там, где её нет в перечне',
    async (role) => {
      vi.mocked(getAdminSession).mockResolvedValue(SESSION[role]);

      /* Ожидалось vs получилось собирается списками и сравнивается разом: так
       падение показывает все разъехавшиеся методы, а не первый попавшийся. */
      const expectedRefusals: string[] = [];
      const actualRefusals: string[] = [];

      for (const method of PANEL_METHODS) {
        if (refusalExpected(method, role, SESSION[role].permissions ?? [])) {
          expectedRefusals.push(method.name);
        }

        const response = await method.handler(requestOf(method.name), contextOf());
        if (await refusedByGuard(response)) actualRefusals.push(method.name);
      }

      expect(actualRefusals).toEqual(expectedRefusals);
    },
    60_000,
  );

  it('🔴 без сессии каждый метод панели отвечает 401, а не пускает', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const notUnauthorized: string[] = [];

    for (const method of PANEL_METHODS) {
      const response = await method.handler(requestOf(method.name), contextOf());
      if (response.status !== 401) notUnauthorized.push(`${method.name} → ${response.status}`);
    }

    expect(notUnauthorized).toEqual([]);
  }, 60_000);
});

/**
 * Разрешения администратора — вызовом маршрута, а не чтением карты (issue
 * #782, #785).
 *
 * 🔴 Проверяется главное обещание фазы: снятый переключатель закрывает раздел
 * **без повторного входа**. Сессия здесь одна и та же — меняется только набор
 * в ней, ровно как в жизни: набор читается из базы на каждый запрос, кеша у
 * него нет.
 */
describe('разрешения администратора: /api/admin/**', () => {
  function adminWith(permissions: readonly AdminPermission[]): AuthModuleTypes.AdminSession {
    return { ...SESSION.admin, permissions };
  }

  async function callLeads(): Promise<Response> {
    const method = PANEL_METHODS.find((candidate) => candidate.name === 'leads GET');
    if (method === undefined) throw new Error('маршрут «leads GET» не найден');

    return method.handler(requestOf(method.name), contextOf());
  }

  it('🔴 снятое разрешение закрывает раздел тем же запросом, без нового входа', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminWith(['leads']));
    const opened = await callLeads();

    /* Тот же человек, та же сессия — владелец снял переключатель. */
    vi.mocked(getAdminSession).mockResolvedValue(adminWith([]));
    const closed = await callLeads();

    expect({
      открыт: await refusedByGuard(opened),
      закрыт: await refusedByGuard(closed),
    }).toEqual({ открыт: false, закрыт: true });
  });

  it('🔴 опасное действие не выдаётся вместе с разделом', async () => {
    const method = PANEL_METHODS.find((candidate) => candidate.name === 'leads/[id] DELETE');
    if (method === undefined) throw new Error('маршрут «leads/[id] DELETE» не найден');

    vi.mocked(getAdminSession).mockResolvedValue(adminWith(['leads']));
    const withoutDanger = await method.handler(requestOf(method.name), contextOf());

    vi.mocked(getAdminSession).mockResolvedValue(adminWith(['leads', 'data_delete']));
    const withDanger = await method.handler(requestOf(method.name), contextOf());

    expect({
      без: await refusedByGuard(withoutDanger),
      с: await refusedByGuard(withDanger),
    }).toEqual({ без: true, с: false });
  });

  it('🔴 администратор не правит ничьи права, даже с полным набором', async () => {
    const method = PANEL_METHODS.find((candidate) => candidate.name === 'staff/[id]/access PATCH');
    if (method === undefined) throw new Error('маршрут «staff/[id]/access PATCH» не найден');

    vi.mocked(getAdminSession).mockResolvedValue(adminWith(ADMIN_PERMISSIONS));
    const response = await method.handler(requestOf(method.name), contextOf());

    expect(await refusedByGuard(response)).toBe(true);
  });

  it('🔴 сессия без набора разрешений читается как «ничего не открыто»', async () => {
    /* Сессия старого образца — без поля вовсе. Страж обязан закрыться, а не
       раскрыться: неизвестное не значит разрешённое. */
    const withoutPermissions = { ...SESSION.admin, permissions: undefined };
    vi.mocked(getAdminSession).mockResolvedValue(withoutPermissions);

    expect(await refusedByGuard(await callLeads())).toBe(true);
  });
});
