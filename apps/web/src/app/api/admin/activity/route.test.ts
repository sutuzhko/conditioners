// @vitest-environment node
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/**
 * Журнал через API: список страницами, пометка и чистка (issue #816, #820,
 * #821, #824).
 *
 * 🔴 Проверяется не только то, что ручки делают, но и то, чего в разделе нет
 * вовсе: метода удаления одной записи. Проверка «нет» пишется один раз и живёт
 * дольше любого ревью — маршрут, добавленный из лучших побуждений, красит её.
 */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

/* Разрыв цикла импортов: `auth` тянет `repo/admin-users`, тот — `http` ради
   `ApiException`, а `http` — обратно `auth`. Без подмены проверка доступа
   уходит в `cookies()` вне запроса (та же строка стоит у отзывов). */
vi.mock('@/server/repo/admin-users', () => ({}));

vi.mock('@/server/repo/activity', () => ({
  list: vi.fn(),
  setNote: vi.fn(),
}));

vi.mock('@/server/services/activity', () => ({ cleanupActivity: vi.fn() }));

import { getAdminSession } from '@/server/auth';
import { list, setNote } from '@/server/repo/activity';
import { cleanupActivity } from '@/server/services/activity';

import { PATCH } from './[id]/route';
import { POST } from './cleanup/route';
import { GET } from './route';

const session = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const stored = {
  id: 'a1',
  actor: { id: 'u1', name: 'Богдан' },
  actorKind: 'user' as const,
  action: 'review.unpublish',
  entity: 'review',
  entityId: 'r5',
  note: null,
  noteUpdatedAt: null,
  createdAt: '2026-09-08T06:12:00.000Z',
};

type Init = { method?: string; body?: string };

function request(url: string, init: Init = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://tulaklimat.localhost'), init);
}

function context(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/** Тело ответа целиком: у конверта ошибок код и текст лежат внутри `error`. */
async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  const parsed: unknown = await response.json();
  return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(session);
  vi.mocked(list).mockResolvedValue({ items: [stored], total: 1, page: 1, pages: 1 });
  vi.mocked(setNote).mockResolvedValue({ ...stored, note: 'разобрались' });
  vi.mocked(cleanupActivity).mockResolvedValue({ removed: 12_408 });
});

describe('список журнала', () => {
  /* 🔴 Список без разбивки не открывается ни через раздел, ни через API
     (issue #816): событий тысячи в месяц, и один ответ «отдай всё» кладёт
     панель вместе с базой. */
  it('отдаётся страницей: номер и число страниц едут в ответе', async () => {
    const response = await GET(request('/api/admin/activity'), undefined);

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toMatchObject({ page: 1, pages: 1, total: 1 });
  });

  it('номер страницы и условия отбора доезжают до репозитория', async () => {
    await GET(
      request('/api/admin/activity?page=3&actor=u2&role=manager&section=review&from=2026-09-01'),
      undefined,
    );

    expect(list).toHaveBeenCalledWith({
      page: 3,
      filter: expect.objectContaining({
        actor: 'u2',
        role: 'manager',
        section: 'review',
        from: '2026-09-01',
      }),
    });
  });

  /* Адрес правят руками и присылают друг другу: мусор снимает условие, а не
     отвечает ошибкой вместо журнала. */
  it('мусор в условии снимает его, а не роняет запрос', async () => {
    const response = await GET(request('/api/admin/activity?role=директор'), undefined);

    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });
});

describe('🔴 пометка — единственное правимое поле записи', () => {
  it('пометка сохраняется', async () => {
    const response = await PATCH(
      request('/api/admin/activity/a1', {
        method: 'PATCH',
        body: JSON.stringify({ note: 'разобрались' }),
      }),
      context('a1'),
    );

    expect(response.status).toBe(200);
    expect(setNote).toHaveBeenCalledWith('a1', 'разобрались');
  });

  it('пустая пометка стирает написанное — это не правка события', async () => {
    const response = await PATCH(
      request('/api/admin/activity/a1', { method: 'PATCH', body: JSON.stringify({ note: '' }) }),
      context('a1'),
    );

    expect(response.status).toBe(200);
    expect(setNote).toHaveBeenCalledWith('a1', '');
  });

  /**
   * 🔴 Ядро issue #824: попытка переписать автора, время или состав изменений
   * отвечает 403, а не 400.
   *
   * Разница не косметическая. 400 читается как «поправьте тело и повторите» —
   * и повтор без лишнего поля действительно проходит. Здесь правильный ответ
   * другой: этого нельзя, и повторять нечего. Журнал, в котором переписывается
   * автор, доказывает ровно столько же, сколько пустой (инвариант 7).
   */
  it.each([
    ['автора', { actorId: 'u9' }],
    ['автора отношением', { actor: { id: 'u9', name: 'Кто-то' } }],
    ['время', { createdAt: '2020-01-01T00:00:00.000Z' }],
    ['состав изменений', { changes: { status: { from: 'x', to: 'y' } } }],
    ['действие', { action: 'review.publish' }],
    ['сущность', { entity: 'order', entityId: 'o1' }],
    ['идентификатор', { id: 'a2' }],
    ['время правки пометки', { noteUpdatedAt: '2020-01-01T00:00:00.000Z' }],
  ])('попытка изменить %s — 403, и запись не тронута', async (_what, body) => {
    const response = await PATCH(
      request('/api/admin/activity/a1', { method: 'PATCH', body: JSON.stringify(body) }),
      context('a1'),
    );

    expect(response.status).toBe(403);
    expect(setNote).not.toHaveBeenCalled();
  });

  /* 🔴 Отказ срабатывает и тогда, когда неизменяемое поле приехало вместе с
     законной пометкой: иначе автора переписывали бы «заодно». */
  it('пометка рядом с автором не спасает: 403 на всё тело', async () => {
    const response = await PATCH(
      request('/api/admin/activity/a1', {
        method: 'PATCH',
        body: JSON.stringify({ note: 'разобрались', actorId: 'u9' }),
      }),
      context('a1'),
    );

    expect(response.status).toBe(403);
    expect(setNote).not.toHaveBeenCalled();
  });

  it('пометка не текстом — 400: тут дело в форме тела, а не в запрете', async () => {
    const response = await PATCH(
      request('/api/admin/activity/a1', { method: 'PATCH', body: JSON.stringify({ note: 7 }) }),
      context('a1'),
    );

    expect(response.status).toBe(400);
  });
});

describe('чистка за период', () => {
  it('принимает период и отдаёт число унесённых записей', async () => {
    const response = await POST(
      request('/api/admin/activity/cleanup', {
        method: 'POST',
        body: JSON.stringify({ from: '2025-01-01', to: '2025-12-31' }),
      }),
      undefined,
    );

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({ removed: 12_408 });
    expect(cleanupActivity).toHaveBeenCalledWith({
      period: { from: '2025-01-01', to: '2025-12-31' },
      actorId: 'u1',
    });
  });

  /* 🔴 Чистка без границ — это «удалить журнал» под другим именем. Обе даты
     обязательны, и отсутствие любой из них не значит «от начала времён». */
  it.each([
    ['без начала', { to: '2025-12-31' }],
    ['без конца', { from: '2025-01-01' }],
    ['вовсе без периода', {}],
    ['задом наперёд', { from: '2025-12-31', to: '2025-01-01' }],
  ])('период %s не принимается', async (_what, body) => {
    const response = await POST(
      request('/api/admin/activity/cleanup', { method: 'POST', body: JSON.stringify(body) }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(cleanupActivity).not.toHaveBeenCalled();
  });
});

describe('🔴 построчного удаления в API нет', () => {
  /* Не «скрыто» и не «только владельцу»: маршрута удаления одной записи не
     существует (ADR-345, issue #821). Убрать из журнала неудобную строку не
     должно быть возможно ничем, кроме чистки за период, — а она оставляет след. */
  it('у записи журнала нет метода DELETE', async () => {
    const record: Record<string, unknown> = await import('./[id]/route');

    expect(Object.keys(record).sort()).toEqual(['PATCH', 'dynamic']);
  });

  it('у списка журнала нет ни удаления, ни записи события', async () => {
    const collection: Record<string, unknown> = await import('./route');

    expect(Object.keys(collection).sort()).toEqual(['GET', 'dynamic']);
  });

  /**
   * 🔴 Обход каталога, а не список импортов: маршрут появляется в проекте как
   * файл, и «нет такого метода» надо спрашивать у дерева. Проверка выше знает
   * только про два файла, которые сама и назвала.
   */
  it('в разделе журнала ровно три файла маршрутов и ни одного лишнего', () => {
    const dir = fileURLToPath(new URL('.', import.meta.url));
    const found = readdirSync(dir, { withFileTypes: true, recursive: true })
      .filter((entry) => entry.name === 'route.ts')
      .map((entry) => relative(dir, join(entry.parentPath, entry.name)))
      .sort();

    expect(found).toEqual(['[id]/route.ts', 'cleanup/route.ts', 'route.ts']);
  });
});
