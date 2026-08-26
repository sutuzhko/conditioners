// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth', () => ({ getAdminSession: vi.fn() }));
vi.mock('@/server/repo/day-blocks', () => ({
  listRange: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import { getAdminSession } from '@/server/auth';
import * as blocks from '@/server/repo/day-blocks';
import { GET, POST } from './route';
import { DELETE, PATCH } from './[id]/route';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u2', login: 'dmitry', role: 'installer' } as const;

const block = {
  id: 'b1',
  userId: 'u1',
  userName: 'Владелец',
  repeat: 'once' as const,
  day: '2026-08-26',
  weekday: null,
  fromMin: null,
  toMin: null,
  reason: 'Семейные дела',
};

const body = {
  repeat: 'once',
  day: '2026-08-26',
  weekday: null,
  fromMin: null,
  toMin: null,
  reason: 'Семейные дела',
};

function jsonRequest(url: string, method: string, payload?: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://tulaklimat.localhost'), {
    method,
    ...(payload === undefined
      ? {}
      : { body: JSON.stringify(payload), headers: { 'content-type': 'application/json' } }),
  });
}

const context = { params: Promise.resolve({ id: 'b1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
  vi.mocked(blocks.listRange).mockResolvedValue([block]);
  vi.mocked(blocks.create).mockResolvedValue(block);
  vi.mocked(blocks.update).mockResolvedValue(block);
  vi.mocked(blocks.remove).mockResolvedValue(undefined);
});

describe('занятость в календаре', () => {
  it('без сессии занятость не отдаётся: это личный график человека', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET(jsonRequest('/api/admin/blocks', 'GET'), undefined);

    expect(response.status).toBe(401);
    expect(blocks.listRange).not.toHaveBeenCalled();
  });

  it('монтажник спрашивает список сам за себя — отбор уходит в запрос', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await GET(jsonRequest('/api/admin/blocks?month=2026-08', 'GET'), undefined);

    expect(blocks.listRange).toHaveBeenCalledWith(
      { role: 'installer', userId: 'u2' },
      new Date('2026-07-26T21:00:00.000Z'),
      new Date('2026-09-06T21:00:00.000Z'),
    );
  });

  it('мусор в месяце не роняет список, а показывает текущий', async () => {
    const response = await GET(jsonRequest('/api/admin/blocks?month=август', 'GET'), undefined);

    expect(response.status).toBe(200);
    expect(blocks.listRange).toHaveBeenCalled();
  });

  it('заводит занятость на себя и отвечает 201', async () => {
    const response = await POST(jsonRequest('/api/admin/blocks', 'POST', body), undefined);

    expect(response.status).toBe(201);
    expect(blocks.create).toHaveBeenCalledWith({ role: 'owner', userId: 'u1' }, expect.anything());
  });

  it('владельца записи задаёт сессия, а не тело запроса', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await POST(jsonRequest('/api/admin/blocks', 'POST', { ...body, userId: 'u1' }), undefined);

    expect(blocks.create).toHaveBeenCalledWith(
      { role: 'installer', userId: 'u2' },
      expect.anything(),
    );
  });

  it('разовая занятость без даты не заводится', async () => {
    const response = await POST(
      jsonRequest('/api/admin/blocks', 'POST', { ...body, day: '' }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(blocks.create).not.toHaveBeenCalled();
  });

  it('повторяемая занятость с датой не заводится', async () => {
    const payload = { ...body, repeat: 'weekly', weekday: 3 };
    const response = await POST(jsonRequest('/api/admin/blocks', 'POST', payload), undefined);

    expect(response.status).toBe(400);
  });

  it('окно без конца не заводится', async () => {
    const payload = { ...body, fromMin: 840 };
    const response = await POST(jsonRequest('/api/admin/blocks', 'POST', payload), undefined);

    expect(response.status).toBe(400);
  });

  it('правит занятость целиком', async () => {
    const payload = { ...body, fromMin: 840, toMin: 960 };
    const response = await PATCH(jsonRequest('/api/admin/blocks/b1', 'PATCH', payload), context);

    expect(response.status).toBe(200);
    expect(blocks.update).toHaveBeenCalledWith(
      { role: 'owner', userId: 'u1' },
      'b1',
      expect.objectContaining({ fromMin: 840, toMin: 960 }),
    );
  });

  it('снимает занятость', async () => {
    const response = await DELETE(jsonRequest('/api/admin/blocks/b1', 'DELETE'), context);

    expect(response.status).toBe(204);
    expect(blocks.remove).toHaveBeenCalledWith({ role: 'owner', userId: 'u1' }, 'b1');
  });

  it('без сессии не снимает', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await DELETE(jsonRequest('/api/admin/blocks/b1', 'DELETE'), context);

    expect(response.status).toBe(401);
    expect(blocks.remove).not.toHaveBeenCalled();
  });
});
