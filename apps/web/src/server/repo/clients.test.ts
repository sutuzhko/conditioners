// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@prisma/client';

/**
 * Клиент из обращения — docs/CRM.md §3.2.
 *
 * 🔴 Проверяется дедупликация по телефону и гонка на уникальном ключе:
 * транзакция при READ COMMITTED даёт атомарность связки, но не сериализацию,
 * и два обращения с одного номера, обработанные одновременно, обе не найдут
 * карточку. Вторая вставка упирается в `phoneKey @unique` — и без повтора
 * владелец получает невнятную пятисотку вместо карточки клиента.
 */
const { dbMock, txMock } = vi.hoisted(() => {
  const txMock = {
    client: { findUnique: vi.fn(), create: vi.fn() },
    lead: { update: vi.fn() },
  };

  return {
    txMock,
    dbMock: {
      lead: { findUnique: vi.fn() },
      client: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

vi.mock('@/server/db', () => ({ db: dbMock }));

/* 🔴 Разрыв цикла импортов: `http` тянет `auth`, тот — `repo/admin-users`, а
   он обратно `http`. На полпути круга `ApiException` оказывается пустой. */
vi.mock('@/server/repo/admin-users', () => ({}));

const { fromLead } = await import('./clients');

const LEAD = {
  id: 'l1',
  name: 'Анна Беляева',
  phone: '+7 (910) 155-24-68',
  address: 'Тула, Ленина, 1',
  clientId: null,
};

const CARD = {
  id: 'c1',
  name: 'Анна Беляева',
  phone: '+7 (910) 155-24-68',
  address: 'Тула, Ленина, 1',
  note: null,
  createdAt: new Date('2026-08-28T09:00:00.000Z'),
  _count: { leads: 1 },
  /* Наряды человека: из них считаются «Заказов», «Сумма» и «Последний» —
     три колонки списка (issue #602). Новый клиент их ещё не имеет. */
  orders: [],
};

function duplicateKey(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.lead.findUnique.mockResolvedValue({ ...LEAD });
  dbMock.client.findUnique.mockResolvedValue({ ...CARD });
  dbMock.$transaction.mockImplementation((run: (tx: typeof txMock) => Promise<unknown>) =>
    run(txMock),
  );
  txMock.client.findUnique.mockResolvedValue(null);
  txMock.client.create.mockResolvedValue({ id: 'c1' });
  txMock.lead.update.mockResolvedValue({ id: 'l1' });
});

describe('клиент из обращения', () => {
  it('нового номера в базе нет — заводится карточка', async () => {
    const result = await fromLead('l1');

    expect(result.created).toBe(true);
    expect(result.client.id).toBe('c1');
    expect(txMock.lead.update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { clientId: 'c1' },
    });
  });

  it('🔴 номер уже в базе — второго человека не заводим', async () => {
    txMock.client.findUnique.mockResolvedValue({ id: 'c1' });

    const result = await fromLead('l1');

    expect(result.created).toBe(false);
    expect(txMock.client.create).not.toHaveBeenCalled();
  });

  it('обращение уже привязано — действие идемпотентно', async () => {
    dbMock.lead.findUnique.mockResolvedValue({ ...LEAD, clientId: 'c1' });

    const result = await fromLead('l1');

    expect(result.created).toBe(false);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it('обращение без телефона карточкой не станет', async () => {
    dbMock.lead.findUnique.mockResolvedValue({ ...LEAD, phone: '' });

    await expect(fromLead('l1')).rejects.toThrow(/нет телефона/i);
  });
});

describe('🔴 гонка двух обращений с одного номера', () => {
  it('повтор находит только что заведённую карточку, а не падает пятисоткой', async () => {
    /* Первый заход повторяет поведение соседней транзакции: карточки ещё не
       видно, вставка упирается в `phoneKey @unique`. */
    txMock.client.create.mockRejectedValueOnce(duplicateKey());
    txMock.client.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ id: 'c1' });

    const result = await fromLead('l1');

    expect(result.client.id).toBe('c1');
    expect(result.created).toBe(false);
    expect(dbMock.$transaction).toHaveBeenCalledTimes(2);
  });

  it('всё остальное пробрасывается: повтор чинит гонку, а не любой сбой', async () => {
    txMock.client.create.mockRejectedValue(new Error('соединение потеряно'));

    await expect(fromLead('l1')).rejects.toThrow(/соединение потеряно/i);
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
