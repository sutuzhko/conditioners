// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: настоящим остаётся `isOwner` — проверяется разбор
   вкладки, а не функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

/* Разрыв цикла импортов: `auth` тянет `repo/admin-users`, тот — `http` ради
   `ApiException`, а `http` — обратно `auth` (см. crm/page.test.tsx). */
vi.mock('@/server/repo/admin-users', () => ({ listInstallers: vi.fn(async () => []) }));

vi.mock('@/server/repo/orders', () => ({
  list: vi.fn(async () => ({ items: [], total: 0, page: 1, pages: 1 })),
  /* Наряд дня монтажника — свой запрос, а не страница общего списка (#633). */
  agenda: vi.fn(async () => []),
  /* Счёт по стопкам считает тот же репозиторий: строка «24 всего · 7
     активных · 2 просрочены» и числа на вкладках берутся из него (issue #593). */
  counts: vi.fn(async () => ({ all: 0, active: 0, new: 0, overdue: 0 })),
  historyTotals: vi.fn(async () => ({ closed: 0, revenue: 0 })),
}));

import { getAdminSession } from '@/server/auth';
import { agenda, list } from '@/server/repo/orders';

import AdminOrdersPage from './page';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u9', login: 'petr', role: 'installer' } as const;

/** Что раздел спросил у репозитория: стопка и есть выбранная вкладка. */
function askedTab(): string | undefined {
  return vi.mocked(list).mock.calls[0]?.[0]?.tab;
}

function open(searchParams: Record<string, string> = {}) {
  return AdminOrdersPage({ searchParams: Promise.resolve(searchParams) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  /* 🔴 Мусор в адресе не пишет в консоль: иначе бот, перебирающий параметры,
     заполняет журнал сервера вместо того, чтобы получить первую вкладку. */
  expect(console.error).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

describe('вкладка списка нарядов приходит из адреса', () => {
  it('ключ макета `declined` открывает стопку отказов', async () => {
    await open({ tab: 'declined' });

    expect(askedTab()).toBe('cancelled');
  });

  it('остальные ключи словаря совпадают с доменными стопками', async () => {
    await open({ tab: 'history' });

    expect(askedTab()).toBe('history');
  });
});

describe('🔴 неизвестное значение tab не роняет раздел (issue #341)', () => {
  it('параметра нет вовсе — первая вкладка', async () => {
    await expect(open()).resolves.toBeTruthy();

    expect(askedTab()).toBe('active');
  });

  it('опечатка — первая вкладка', async () => {
    await expect(open({ tab: 'activ' })).resolves.toBeTruthy();

    expect(askedTab()).toBe('active');
  });

  it('ключ чужого раздела — первая вкладка: словарь у каждого раздела свой', async () => {
    await expect(open({ tab: 'materials' })).resolves.toBeTruthy();

    expect(askedTab()).toBe('active');
  });

  it('длинная строка — первая вкладка', async () => {
    await expect(open({ tab: 'x'.repeat(4096) })).resolves.toBeTruthy();

    expect(askedTab()).toBe('active');
  });

  it('доменное значение мимо словаря адреса тоже даёт первую вкладку', async () => {
    /* `cancelled` — статус наряда, а не ключ вкладки: в адресе живёт
       `declined` (ADR-255). */
    await expect(open({ tab: 'cancelled' })).resolves.toBeTruthy();

    expect(askedTab()).toBe('active');
  });
});

describe('🔴 у монтажника свой экран, а не таблица владельца (issue #633)', () => {
  it('раздел уходит за нарядом дня, а не за страницей списка', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await expect(open()).resolves.toBeTruthy();

    expect(agenda).toHaveBeenCalledTimes(1);
    expect(list).not.toHaveBeenCalled();
  });

  it('окно приходит из адреса, а мусор в нём открывает сегодняшний день', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await open({ when: 'week' });
    expect(vi.mocked(agenda).mock.calls[0]?.[1]?.days).toBe(7);

    vi.clearAllMocks();
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await open({ when: 'позавчера' });
    expect(vi.mocked(agenda).mock.calls[0]?.[1]?.days).toBe(1);
  });

  it('🔴 выборку сужает репозиторий: смотрящий уезжает в запрос (ADR-114)', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await open();

    expect(vi.mocked(agenda).mock.calls[0]?.[0]).toEqual({ role: 'installer', userId: 'u9' });
  });
});
