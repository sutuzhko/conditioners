// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

/* Частичная подмена: `isOwner` берём настоящий — проверяется разграничение,
   а не сама функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

import { redirect } from 'next/navigation';

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
  it('монтажнику отказывает — до чтения данных', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

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
  it('пускает монтажника', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await expect(requirePage()).resolves.toEqual(installer);
  });

  it('без сессии отправляет на вход', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    await expect(requirePage()).rejects.toThrow('redirect:/admin/login');
  });
});
