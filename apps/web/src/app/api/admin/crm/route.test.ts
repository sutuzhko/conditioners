// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth', () => ({ getAdminSession: vi.fn() }));
vi.mock('@/server/repo/crm', () => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import { getAdminSession } from '@/server/auth';
import * as crm from '@/server/repo/crm';
import { POST } from './route';
import { DELETE, PATCH } from './[id]/route';

const session = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const event = {
  id: 'e1',
  kind: 'measure' as const,
  status: 'planned' as const,
  at: '2026-08-23T11:30:00.000Z',
  clientName: 'Ирина',
  clientPhone: '+7 (900) 123-45-67',
  address: null,
  note: null,
  leadId: null,
};

const body = {
  kind: 'measure',
  day: '2026-08-23',
  time: '14:30',
  clientName: 'Ирина',
  clientPhone: '+7 (900) 123-45-67',
  address: '',
  note: '',
  leadId: null,
};

function jsonRequest(url: string, method: string, payload: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://tulaklimat.localhost'), {
    method,
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });
}

const context = { params: Promise.resolve({ id: 'e1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(session);
  vi.mocked(crm.create).mockResolvedValue(event);
  vi.mocked(crm.update).mockResolvedValue(event);
  vi.mocked(crm.remove).mockResolvedValue(undefined);
});

describe('календарь работ в админке', () => {
  it('без сессии дело не заводится: это внутренний график с телефонами клиентов', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await POST(jsonRequest('/api/admin/crm', 'POST', body), undefined);

    expect(response.status).toBe(401);
    expect(crm.create).not.toHaveBeenCalled();
  });

  it('заводит дело и отвечает 201', async () => {
    const response = await POST(jsonRequest('/api/admin/crm', 'POST', body), undefined);

    expect(response.status).toBe(201);
    expect(crm.create).toHaveBeenCalledWith(expect.objectContaining({ clientName: 'Ирина' }));
  });

  it('дело без клиента не заводится', async () => {
    const response = await POST(
      jsonRequest('/api/admin/crm', 'POST', { ...body, clientName: '' }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(crm.create).not.toHaveBeenCalled();
  });

  it('закрывает дело одним статусом', async () => {
    const response = await PATCH(
      jsonRequest('/api/admin/crm/e1', 'PATCH', { status: 'done' }),
      context,
    );

    expect(response.status).toBe(200);
    expect(crm.update).toHaveBeenCalledWith('e1', { status: 'done' });
  });

  it('пустую правку отклоняет — иначе она молча ничего не меняет', async () => {
    const response = await PATCH(jsonRequest('/api/admin/crm/e1', 'PATCH', {}), context);

    expect(response.status).toBe(400);
    expect(crm.update).not.toHaveBeenCalled();
  });

  it('удаляет дело', async () => {
    const response = await DELETE(
      new NextRequest('http://tulaklimat.localhost/api/admin/crm/e1', { method: 'DELETE' }),
      context,
    );

    expect(response.status).toBe(204);
    expect(crm.remove).toHaveBeenCalledWith('e1');
  });

  it('без сессии не удаляет', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await DELETE(
      new NextRequest('http://tulaklimat.localhost/api/admin/crm/e1', { method: 'DELETE' }),
      context,
    );

    expect(response.status).toBe(401);
    expect(crm.remove).not.toHaveBeenCalled();
  });
});
