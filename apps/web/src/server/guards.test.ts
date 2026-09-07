// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_ROLES, type AdminRole } from '@/entities/staff/model';
import type * as AuthModuleTypes from '@/server/auth';

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

const administrator = { ...owner, userId: 'u2', login: 'ivanova', role: 'admin' } as const;
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

  /* 🔴 Перечень закрытый, а не «все, кроме перечисленных». Проверка идёт по
     всем четырём ролям разом: роль, которую в перечне не назвали, обязана
     получать отказ — иначе следующая заведённая роль въедет в чужой раздел
     молча (ADR-344). */
  it.each(ADMIN_ROLES)('в перечень из одной роли не проходит никто другой: %s', async (role) => {
    vi.mocked(getAdminSession).mockResolvedValue(SESSIONS[role]);

    const only: readonly AdminRole[] = ['manager'];

    if (role === 'manager') {
      await expect(requireRolePage(only)).resolves.toEqual(SESSIONS[role]);
      return;
    }

    await expect(requireRolePage(only)).rejects.toThrow('forbidden');
  });

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

    await expect(requirePage()).resolves.toEqual(SESSIONS[role]);
  });

  it('без сессии отправляет на вход', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    await expect(requirePage()).rejects.toThrow('redirect:/admin/login');
  });
});
