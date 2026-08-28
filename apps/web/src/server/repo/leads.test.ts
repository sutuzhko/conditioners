// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Мок захватывается через `vi.hoisted`: заявка выбирается строкой целиком, и
   заготовка из двух десятков полей ради проверки разграничения ничего бы не
   объяснила. */
const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock('@/server/db', () => ({ db: { lead: { findMany: mocks.findMany } } }));

import { listCreatedBetween } from '@/server/repo/leads';

const OWNER = { role: 'owner', userId: 'u1' } as const;
const INSTALLER = { role: 'installer', userId: 'u2' } as const;

const from = new Date('2026-07-31T21:00:00.000Z');
const to = new Date('2026-08-31T21:00:00.000Z');

const row = {
  id: 'l1',
  name: 'Ирина Соколова',
  phone: '+7 (910) 155-24-68',
  topic: 'INSTALL',
  model: null,
  area: null,
  address: 'Тула, Первомайская, 12',
  comment: null,
  status: 'NEW',
  context: null,
  consent: true,
  consentAt: new Date('2026-08-20T09:00:00.000Z'),
  clientId: null,
  createdAt: new Date('2026-08-20T09:00:00.000Z'),
  updatedAt: new Date('2026-08-20T09:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findMany.mockResolvedValue([row]);
});

describe('заявки в календаре', () => {
  it('🔴 монтажнику заявок не отдаётся вовсе — и запрос за ними не уходит', async () => {
    await expect(listCreatedBetween(INSTALLER, from, to)).resolves.toEqual([]);

    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('владелец получает заявки промежутка как раньше', async () => {
    const leads = await listCreatedBetween(OWNER, from, to);

    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ id: 'l1', name: 'Ирина Соколова' });
    expect(mocks.findMany.mock.calls[0]?.[0]?.where).toMatchObject({
      createdAt: { gte: from, lt: to },
    });
  });
});
