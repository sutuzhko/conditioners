// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: настоящим остаётся `isOwner` — проверяется разбор
   вкладки, а не функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

/* Разрыв цикла импортов через `repo/admin-users` — как в crm/page.test.tsx. */
vi.mock('@/server/repo/admin-users', () => ({ listInstallers: vi.fn(async () => []) }));

vi.mock('@/server/repo/reviews', () => ({
  listByStatus: vi.fn(async () => ({ items: [], total: 0, page: 1, pages: 1 })),
}));

import { getAdminSession } from '@/server/auth';
import { listByStatus } from '@/server/repo/reviews';

import AdminReviewsPage from './page';

/**
 * Находит в дереве страницы список отзывов: проверяется то, чем список
 * объясняет пустоту, а объясняет он её пропсом.
 */
function reviewListProps(node: unknown): { filtered?: boolean } | null {
  if (node === null || typeof node !== 'object') return null;

  const element = node as { props?: Record<string, unknown> };
  const props = element.props;
  if (props === undefined) return null;

  if ('reviews' in props) return props as { filtered?: boolean };

  const children = props['children'];
  const list = Array.isArray(children) ? children : [children];

  for (const child of list) {
    const found = reviewListProps(child);
    if (found !== null) return found;
  }
  return null;
}

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

/** За каким статусом раздел сходил в базу. `undefined` — за всеми сразу. */
function askedStatus(): string | undefined {
  return vi.mocked(listByStatus).mock.calls[0]?.[0]?.status;
}

function open(searchParams: Record<string, string> = {}) {
  return AdminReviewsPage({ searchParams: Promise.resolve(searchParams) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  /* 🔴 Мусор в адресе не пишет в консоль: бот, перебирающий параметры, не
     должен заполнять журнал сервера. */
  expect(console.error).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

describe('вкладка отзывов приходит из адреса', () => {
  it('раздел открывается на «На модерации» — они и требуют решения', async () => {
    await open();

    expect(askedStatus()).toBe('pending');
  });

  it('ключ макета `published` открывает опубликованные', async () => {
    await open({ tab: 'published' });

    expect(askedStatus()).toBe('approved');
  });

  it('вкладка «Все» снимает фильтр — вместе с архивом', async () => {
    await open({ tab: 'all' });

    expect(askedStatus()).toBeUndefined();
    expect(listByStatus).toHaveBeenCalledWith({ page: 1 });
  });

  it('страница списка живёт в адресе рядом со вкладкой', async () => {
    await open({ tab: 'rejected', page: '3' });

    expect(listByStatus).toHaveBeenCalledWith({ status: 'rejected', page: 3 });
  });
});

describe('пустая вкладка и пустой раздел объясняются по-разному (issue #335)', () => {
  it('🔴 на пустом разделе первая вкладка не винит фильтр: отзывов нет вообще', async () => {
    vi.mocked(listByStatus).mockResolvedValue({ items: [], total: 0, page: 1, pages: 1 });

    const page = await open();

    expect(reviewListProps(page)?.filtered).toBe(false);
  });

  it('вкладка без записей при живом разделе объясняет пустоту фильтром', async () => {
    vi.mocked(listByStatus)
      /* Своя вкладка пуста, а в разделе отзывы есть: второй ответ — общий счёт. */
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, pages: 1 })
      .mockResolvedValueOnce({ items: [], total: 4, page: 1, pages: 1 });

    const page = await open({ tab: 'rejected' });

    expect(reviewListProps(page)?.filtered).toBe(true);
  });

  it('на вкладке «Все» фильтра нет, и лишнего запроса тоже', async () => {
    vi.mocked(listByStatus).mockResolvedValue({ items: [], total: 0, page: 1, pages: 1 });

    const page = await open({ tab: 'all' });

    expect(reviewListProps(page)?.filtered).toBe(false);
    expect(listByStatus).toHaveBeenCalledTimes(1);
  });
});

describe('🔴 неизвестное значение tab не роняет раздел (issue #341)', () => {
  it('параметра нет вовсе — первая вкладка', async () => {
    await expect(open()).resolves.toBeTruthy();

    expect(askedStatus()).toBe('pending');
  });

  it('опечатка — первая вкладка', async () => {
    await expect(open({ tab: 'pendign' })).resolves.toBeTruthy();

    expect(askedStatus()).toBe('pending');
  });

  it('ключ чужого раздела — первая вкладка: словарь у каждого раздела свой', async () => {
    await expect(open({ tab: 'materials' })).resolves.toBeTruthy();

    expect(askedStatus()).toBe('pending');
  });

  it('длинная строка — первая вкладка', async () => {
    await expect(open({ tab: 'x'.repeat(4096) })).resolves.toBeTruthy();

    expect(askedStatus()).toBe('pending');
  });

  it('доменный статус мимо словаря адреса тоже даёт первую вкладку', async () => {
    /* `approved` — статус отзыва, а не ключ вкладки: в адресе живёт
       `published` (ADR-255). */
    await expect(open({ tab: 'approved' })).resolves.toBeTruthy();

    expect(askedStatus()).toBe('pending');
  });
});
