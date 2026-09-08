// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_ROLES, type AdminRole } from '@/entities/staff/model';
import type * as AuthModuleTypes from '@/server/auth';
import { ADMIN_PATHNAME_HEADER } from '@/shared/config/admin-headers';

/**
 * Адрес запроса — тот, что приносит middleware заголовком (ADR-095).
 *
 * 🔴 Без него страж администратора не работает вовсе: требуемое разрешение
 * называет центральная карта по адресу, а своего пути серверный компонент не
 * знает. Заголовок здесь подменяется, потому что предмет проверки —
 * разграничение, а не то, как Next доставляет заголовки.
 */
let pathname = '';

vi.mock('next/headers', () => ({
  headers: vi.fn(
    async () => new Headers(pathname === '' ? {} : { [ADMIN_PATHNAME_HEADER]: pathname }),
  ),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
  /* 🔴 Отказ — не разворот: страница обязана отдать 403, а не 307 с телом
     чужого раздела. Подмена повторяет контракт `forbidden()` — она бросает. */
  forbidden: vi.fn(() => {
    throw new Error('forbidden');
  }),
}));

/* Частичная подмена: настоящим остаётся всё, кроме чтения сессии, — проверяется
   разграничение, а не то, как сессия достаётся из cookie. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

import { redirect } from 'next/navigation';

import { getAdminSession } from '@/server/auth';

import { requireOwnerPage, requirePage, requireRolePage } from './guards';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

/* 🔴 Владелец открыл администратору один раздел — «Заявки». Ролью ему не
   открыто ничего сверх профиля: он ходит по разрешениям (ADR-344). */
const administrator = {
  ...owner,
  userId: 'u2',
  login: 'ivanova',
  role: 'admin',
  permissions: ['leads'],
} as const;
const manager = { ...owner, userId: 'u3', login: 'lebedeva', role: 'manager' } as const;
const installer = { ...owner, userId: 'u4', login: 'sokolov', role: 'installer' } as const;

const SESSIONS: Readonly<Record<AdminRole, AuthModuleTypes.AdminSession>> = {
  owner,
  admin: administrator,
  manager,
  installer,
};

/** Клиентский цикл: тот перечень, которым закрыты «Заявки» (ADR-344). */
const CLIENT_CYCLE: readonly AdminRole[] = ['owner', 'admin', 'manager'];

beforeEach(() => {
  vi.clearAllMocks();
  pathname = '/admin/leads';
});

describe('🔴 страница, открытая перечню ролей', () => {
  it.each(CLIENT_CYCLE)('пускает роль из перечня: %s', async (role) => {
    vi.mocked(getAdminSession).mockResolvedValue(SESSIONS[role]);

    await expect(requireRolePage(CLIENT_CYCLE)).resolves.toEqual(SESSIONS[role]);
  });

  it('монтажнику, которого в перечне нет, отвечает отказом', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await expect(requireRolePage(CLIENT_CYCLE)).rejects.toThrow('forbidden');
  });

  /* 🔴 Перечень закрытый, а не «все, кроме перечисленных»: роль, которую в
     перечне не назвали, обязана получать отказ — иначе следующая заведённая
     роль въедет в чужой раздел молча (ADR-344).

     🔴 Администратора среди проверяемых нет намеренно, и это не послабление.
     Перечень ролей про него не отвечает вовсе: ADR-344 даёт ему права
     владельца **под переключателями владельца**, то есть решает центральная
     карта разрешений по адресу страницы. Спрашивать заодно перечень значило
     бы, что выданное разрешение не работает, пока роль не вписали в
     `entities/staff/access`, — то есть переключатель ничего не решает.
     Что администратор закрыт по умолчанию, проверяется ниже своим блоком. */
  it.each(ADMIN_ROLES.filter((role) => role !== 'admin'))(
    'в перечень из одной роли не проходит никто другой: %s',
    async (role) => {
      vi.mocked(getAdminSession).mockResolvedValue(SESSIONS[role]);

      const only: readonly AdminRole[] = ['manager'];

      if (role === 'manager') {
        await expect(requireRolePage(only)).resolves.toEqual(SESSIONS[role]);
        return;
      }

      await expect(requireRolePage(only)).rejects.toThrow('forbidden');
    },
  );

  it('пустой перечень не пускает никого', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(owner);

    await expect(requireRolePage([])).rejects.toThrow('forbidden');
  });

  it('без сессии отправляет на вход', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    await expect(requireRolePage(CLIENT_CYCLE)).rejects.toThrow('redirect:/admin/login');
  });
});

describe('🔴 страница раздела владельца', () => {
  it.each(['admin', 'manager', 'installer'] as const)('отказывает роли %s', async (role) => {
    vi.mocked(getAdminSession).mockResolvedValue(SESSIONS[role]);
    /* Журнал событий — раздел, который не открывается никаким переключателем
       (ADR-345): на нём отказ администратору виден так же, как остальным. */
    pathname = '/admin/activity';

    await expect(requireOwnerPage()).rejects.toThrow('forbidden');
  });

  /* 🔴 Разворот вместо отказа возвращал 307 и тело чужого раздела вместе с
     ним: браузер его выбрасывал, `curl` — нет (issue #353, ADR-095). */
  it('🔴 монтажника не разворачивает: отказ обязан быть отказом', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await expect(requireOwnerPage()).rejects.toThrow();
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it('без сессии отправляет на вход', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    await expect(requireOwnerPage()).rejects.toThrow('redirect:/admin/login');
  });

  it('владельцу отдаёт сессию', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(owner);

    await expect(requireOwnerPage()).resolves.toEqual(owner);
  });
});

describe('страница для любого вошедшего', () => {
  it.each(ADMIN_ROLES)('пускает роль %s', async (role) => {
    vi.mocked(getAdminSession).mockResolvedValue(SESSIONS[role]);
    /* Свой профиль — единственная страница, открытая администратору без
       единого выданного разрешения: закрывать её переключателем не за чем. */
    pathname = '/admin/profile';

    await expect(requirePage()).resolves.toEqual(SESSIONS[role]);
  });

  it('без сессии отправляет на вход', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    await expect(requirePage()).rejects.toThrow('redirect:/admin/login');
  });
});

/**
 * Разрешения администратора у страниц (ADR-344, issue #783).
 *
 * 🔴 Здесь проверяется то, чего не проверяет ни один контракт: что страж
 * действительно спрашивает карту, а не перечень. Контракт отвечает на вопрос
 * «что написано в карте», а этот блок — «что выполнится».
 */
describe('🔴 страница панели: администратор ходит по разрешениям', () => {
  function adminWith(permissions: readonly string[]): AuthModuleTypes.AdminSession {
    return { ...administrator, permissions: permissions.filter(isPermission) };
  }

  function isPermission(value: string): value is 'leads' | 'clients' {
    return value === 'leads' || value === 'clients';
  }

  it('выданный раздел открывается, хотя перечень ролей администратора не называет', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminWith(['clients']));
    pathname = '/admin/clients/c1';

    await expect(requireOwnerPage()).resolves.toEqual(adminWith(['clients']));
  });

  it('🔴 снятое разрешение закрывает страницу без повторного входа', async () => {
    pathname = '/admin/clients';

    vi.mocked(getAdminSession).mockResolvedValue(adminWith(['clients']));
    await expect(requireOwnerPage()).resolves.toBeDefined();

    /* Тот же человек, та же сессия — владелец снял переключатель. */
    vi.mocked(getAdminSession).mockResolvedValue(adminWith([]));
    await expect(requireOwnerPage()).rejects.toThrow('forbidden');
  });

  it('🔴 без адреса в заголовке администратор не проходит никуда', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminWith(['leads']));
    pathname = '';

    await expect(requireRolePage(CLIENT_CYCLE)).rejects.toThrow('forbidden');
  });

  it('🔴 адрес вне известных разделов администратору не открывается', async () => {
    /* Раскладка панели незнакомый адрес пропускает намеренно (`sectionAllows`):
       новый раздел не обязан появляться в колонке раньше, чем он готов. Для
       администратора такой мягкости нет — карта закрыта. */
    vi.mocked(getAdminSession).mockResolvedValue(adminWith(['leads']));
    pathname = '/admin/unknown-section';

    await expect(requireRolePage(CLIENT_CYCLE)).rejects.toThrow('forbidden');
  });
});
