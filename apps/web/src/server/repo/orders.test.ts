// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Правка наряда: то, что схема проверить не может.
 *
 * 🔴 Здесь досматривается связка «статус + исполнитель» на уже сохранённой
 * записи и три ссылки на чужие сущности. Схема видит только присланные поля,
 * поэтому половина случаев — «статус без исполнителя» и «исполнитель без
 * статуса» — ловится только тут.
 *
 * До записи ни один из этих случаев не доходит: транзакция подменена отказом,
 * и её вызов означает «проверки пройдены».
 */
const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    order: { findUnique: vi.fn() },
    client: { findUnique: vi.fn() },
    adminUser: { findUnique: vi.fn() },
    lead: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({ db: dbMock }));

/* 🔴 Разрыв цикла импортов: `http` тянет `auth`, тот — `repo/admin-users`, а
   он обратно `http`. На полпути круга `ApiException` оказывается пустой. */
vi.mock('@/server/repo/admin-users', () => ({}));

vi.mock('@/server/repo/settings', () => ({
  workWindow: vi.fn(() => Promise.resolve({ fromMin: 9 * 60, toMin: 19 * 60 })),
}));

vi.mock('@/server/repo/client-units', () => ({ fromCompletedOrder: vi.fn() }));

const { update } = await import('./orders');

/** Транзакция не должна начаться: её отказ и есть отметка «дошли до записи». */
const REACHED_WRITE = 'дошли до записи';

/* Сохранённая запись наряда — ровно те поля, которые читает `update` перед
   записью. Тип объявлен явно: из литерала вывелись бы `'NEW'` и `null`, и
   подменить их в отдельном случае было бы нечем. */
type SavedOrder = {
  status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  installerId: string | null;
  deductionSum: number;
  deductionReason: string | null;
};

const SAVED: SavedOrder = {
  status: 'NEW',
  installerId: null,
  deductionSum: 0,
  deductionReason: null,
};

function saved(patch: Partial<SavedOrder> = {}): void {
  dbMock.order.findUnique.mockResolvedValue({ ...SAVED, ...patch });
}

beforeEach(() => {
  vi.clearAllMocks();
  saved();
  dbMock.client.findUnique.mockResolvedValue({ id: 'c1' });
  dbMock.lead.findUnique.mockResolvedValue({ id: 'l1' });
  dbMock.adminUser.findUnique.mockResolvedValue({
    id: 'u2',
    name: 'Дмитрий Соколов',
    login: 'sokolov',
    active: true,
  });
  dbMock.$transaction.mockRejectedValue(new Error(REACHED_WRITE));
});

describe('🔴 статус и исполнитель досматриваются на сохранённой записи', () => {
  it('назначенный исполнитель поднимает «Новый» до «Назначен» сам', async () => {
    await expect(update('o1', { installerId: 'u2' }, 'u1')).rejects.toThrow(REACHED_WRITE);
  });

  it('снятый исполнитель возвращает «Назначен» в «Новые»', async () => {
    saved({ status: 'ASSIGNED', installerId: 'u2' });

    await expect(update('o1', { installerId: null }, 'u1')).rejects.toThrow(REACHED_WRITE);
  });

  it('🔴 «Новым» наряд с исполнителем не остаётся: иначе он навсегда во вкладке «Новые»', async () => {
    saved({ status: 'ASSIGNED', installerId: 'u2' });

    await expect(update('o1', { status: 'new' }, 'u1')).rejects.toThrow(/есть исполнитель/i);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it('🔴 исполнителя у наряда в работе не снять: он потерял бы к нему доступ', async () => {
    saved({ status: 'IN_PROGRESS', installerId: 'u2' });

    await expect(update('o1', { installerId: null }, 'u1')).rejects.toThrow(
      /Выберите исполнителя/i,
    );
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it('«Назначен» без сохранённого исполнителя не проходит', async () => {
    await expect(update('o1', { status: 'assigned' }, 'u1')).rejects.toThrow(
      /Выберите исполнителя/i,
    );
  });

  it('закрытие наряда без исполнителя разрешено: работу мог сделать сам владелец', async () => {
    await expect(update('o1', { status: 'cancelled' }, 'u1')).rejects.toThrow(REACHED_WRITE);
  });
});

describe('ссылки наряда на чужие сущности', () => {
  it('несуществующий клиент — понятный отказ, а не 500 от внешнего ключа', async () => {
    dbMock.client.findUnique.mockResolvedValue(null);

    await expect(update('o1', { clientId: 'нет' }, 'u1')).rejects.toThrow(/клиента нет в базе/i);
  });

  it('несуществующий монтажник — тоже', async () => {
    dbMock.adminUser.findUnique.mockResolvedValue(null);

    await expect(update('o1', { installerId: 'нет' }, 'u1')).rejects.toThrow(
      /монтажника нет в базе/i,
    );
  });

  it('🔴 несуществующее обращение проверяется наравне с остальными двумя', async () => {
    dbMock.lead.findUnique.mockResolvedValue(null);

    await expect(update('o1', { leadId: 'нет' }, 'u1')).rejects.toThrow(/обращения нет в базе/i);
  });

  it('снятая ссылка на обращение в базу не ходит', async () => {
    await expect(update('o1', { leadId: null }, 'u1')).rejects.toThrow(REACHED_WRITE);
    expect(dbMock.lead.findUnique).not.toHaveBeenCalled();
  });
});

describe('🔴 отключённая учётная запись исполнителем не назначается', () => {
  beforeEach(() => {
    dbMock.adminUser.findUnique.mockResolvedValue({
      id: 'u2',
      name: 'Дмитрий Соколов',
      login: 'sokolov',
      active: false,
    });
  });

  it('назначить работу на отключённого — значит назначить её в никуда', async () => {
    await expect(update('o1', { installerId: 'u2' }, 'u1')).rejects.toThrow(/отключена/i);
  });

  it('уже стоящий в наряде уволенный не мешает править адрес', async () => {
    saved({ status: 'ASSIGNED', installerId: 'u2' });

    await expect(
      update('o1', { installerId: 'u2', address: 'Тула, Мира, 4' }, 'u1'),
    ).rejects.toThrow(REACHED_WRITE);
  });
});

describe('удержание без основания', () => {
  it('сумма при пустом сохранённом основании не сохраняется', async () => {
    await expect(update('o1', { deductionSum: 500 }, 'u1')).rejects.toThrow(/основание/i);
  });

  it('снятие основания при сохранённой сумме — тот же случай', async () => {
    saved({ deductionSum: 500, deductionReason: 'Разбитый блок' });

    await expect(update('o1', { deductionReason: null }, 'u1')).rejects.toThrow(/основание/i);
  });
});

describe('наряда нет', () => {
  it('правка несуществующего наряда отвечает «не найден», а не падает', async () => {
    dbMock.order.findUnique.mockResolvedValue(null);

    await expect(update('нет', { address: 'Тула' }, 'u1')).rejects.toThrow(/не найден/i);
  });
});

/**
 * 🔴 Двое в панели. Владелец открыл наряд в 14:00, коллега назначил монтажника
 * в 14:02, владелец сохранил комментарий в 14:05 — и назначение отменилось,
 * потому что форма шлёт все поля разом в том виде, в каком их загрузили
 * (BUGS §1864). Никто об этом не узнавал: `notifyOrderUpdated` честно
 * рассылал уведомление о результате затирания.
 */
describe('🔴 версия карточки: сохранение не затирает чужую правку', () => {
  /* Строка в том виде, в каком её читает `toCard`: тонкой заглушкой не
     обойтись — карточка собирается из неё целиком. */
  const CARD = {
    id: 'o1',
    number: 1059,
    type: 'INSTALL',
    status: 'NEW',
    client: { id: 'c1', name: 'Ирина', phone: '+79101552468' },
    installer: null,
    at: new Date('2026-08-28T08:00:00.000Z'),
    durationMin: 180,
    overtimeMin: 0,
    address: 'Тула, Первомайская, 12',
    intercom: null,
    phone2: null,
    floor: null,
    heightWorks: false,
    payment: 'COMPANY',
    price: 38_500,
    installerFee: 9000,
    deductionSum: 0,
    deductionReason: null,
    comment: null,
    ownerNote: null,
    leadId: null,
    extraWork: null,
    report: null,
    resultAt: null,
    units: [],
    createdAt: new Date('2026-08-26T14:00:00.000Z'),
    updatedAt: new Date('2026-08-28T11:00:00.000Z'),
  };
  const OPENED_AT = '2026-08-28T11:00:00.000Z';

  /** Транзакция выполняется по-настоящему: проверяется именно запись. */
  function runTransaction(tx: Record<string, unknown>): void {
    dbMock.$transaction.mockImplementation(async (run: (client: unknown) => Promise<unknown>) =>
      run(tx),
    );
  }

  function txWith(written: number): Record<string, unknown> {
    return {
      orderUnit: { deleteMany: vi.fn(), createMany: vi.fn() },
      orderHistory: { createMany: vi.fn() },
      order: {
        updateMany: vi.fn().mockResolvedValue({ count: written }),
        update: vi.fn().mockResolvedValue(CARD),
        findUniqueOrThrow: vi.fn().mockResolvedValue(CARD),
      },
    };
  }

  it('версия совпала — правка записывается', async () => {
    const tx = txWith(1);
    runTransaction(tx);

    await update('o1', { comment: 'Позвонить за час', updatedAt: OPENED_AT }, 'u1');

    const order = tx.order as { updateMany: ReturnType<typeof vi.fn> };
    expect(order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'o1', updatedAt: new Date(OPENED_AT) } }),
    );
  });

  it('🔴 версия разошлась — отказ, а не запись поверх чужой правки', async () => {
    const tx = txWith(0);
    runTransaction(tx);

    await expect(
      update('o1', { comment: 'Позвонить за час', updatedAt: OPENED_AT }, 'u1'),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('отказ объясняет, что делать: обновить и повторить', async () => {
    runTransaction(txWith(0));

    await expect(
      update('o1', { comment: 'Позвонить за час', updatedAt: OPENED_AT }, 'u1'),
    ).rejects.toThrow(/обновите страницу/i);
  });

  /**
   * Версия необязательна: точечные действия вроде кнопки смены статуса шлют
   * одно поле и ничего не затирают по построению. Требовать её от них значило
   * бы сломать их ради защиты, которая им не нужна.
   */
  it('без версии пишется как раньше — обычным update', async () => {
    const tx = txWith(1);
    runTransaction(tx);

    await update('o1', { comment: 'Позвонить за час' }, 'u1');

    const order = tx.order as {
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    expect(order.update).toHaveBeenCalled();
    expect(order.updateMany).not.toHaveBeenCalled();
  });
});
