// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
}));

/* Частичная подмена: `isOwner` берём настоящий — проверяется разграничение,
   а не сама функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

import { getAdminSession } from '@/server/auth';

import { requireOwnerPage, requirePage } from './guards';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u2', login: 'sokolov', role: 'installer' } as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('🔴 страница раздела владельца', () => {
  it('монтажника уводит на его рабочий экран — до чтения данных', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await expect(requireOwnerPage()).rejects.toThrow('redirect:/admin/crm');
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
  it('пускает монтажника', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await expect(requirePage()).resolves.toEqual(installer);
  });

  it('без сессии отправляет на вход', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    await expect(requirePage()).rejects.toThrow('redirect:/admin/login');
  });
});
