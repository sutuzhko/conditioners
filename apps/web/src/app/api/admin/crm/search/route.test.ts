// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: роль сравнивает настоящий код — проверяется
   разграничение, а не функция сравнения. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

/* Разрыв цикла импортов: `auth` тянет `repo/admin-users`, тот — `http`, а
   `http` — обратно `auth`, и проверка доступа уходит в `cookies()` вне
   запроса. Та же строка стоит у соседей по каталогу. */
vi.mock('@/server/repo/admin-users', () => ({}));
vi.mock('@/server/repo/crm', () => ({ search: vi.fn() }));

import { getAdminSession } from '@/server/auth';
import * as crm from '@/server/repo/crm';
import { GET } from './route';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u2', login: 'petrov', role: 'installer' } as const;

function ask(query: string): NextRequest {
  const url = new URL('/api/admin/crm/search', 'http://tulaklimat.localhost');
  url.searchParams.set('q', query);

  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
  vi.mocked(crm.search).mockResolvedValue([]);
});

describe('GET /api/admin/crm/search', () => {
  it('без сессии отвечает 401 и до базы не доходит', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET(ask('Первомайская'), {});

    expect(response.status).toBe(401);
    expect(crm.search).not.toHaveBeenCalled();
  });

  it('🔴 монтажника пускает: искать может и он, но найдёт только своё', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await GET(ask('Первомайская'), {});

    expect(response.status).toBe(200);
    /* Роль уезжает в запрос целиком: разграничение живёт в условии к базе,
       а не в маршруте (ADR-114). */
    expect(crm.search).toHaveBeenCalledWith(installer, 'Первомайская');
  });

  it('отдаёт находки в конверте контракта', async () => {
    vi.mocked(crm.search).mockResolvedValue([
      {
        kind: 'order',
        id: 'o1',
        number: 1059,
        clientName: 'Пётр Соколов',
        address: 'Тула, Первомайская, 12',
        at: '2026-09-01T07:00:00.000Z',
      },
    ]);

    const response = await GET(ask('Соколов'), {});

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          kind: 'order',
          id: 'o1',
          number: 1059,
          clientName: 'Пётр Соколов',
          address: 'Тула, Первомайская, 12',
          at: '2026-09-01T07:00:00.000Z',
        },
      ],
    });
  });

  it('🔴 пустой запрос — не ошибка: так выглядит очищенное поле поиска', async () => {
    const response = await GET(ask('  '), {});

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ items: [] });
    expect(crm.search).toHaveBeenCalledWith(owner, '  ');
  });

  it('запрос без параметра тоже отвечает пустым списком', async () => {
    const response = await GET(
      new NextRequest(new URL('/api/admin/crm/search', 'http://tulaklimat.localhost')),
      {},
    );

    expect(response.status).toBe(200);
    expect(crm.search).toHaveBeenCalledWith(owner, '');
  });
});
