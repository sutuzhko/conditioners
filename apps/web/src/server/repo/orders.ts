/**
 * Наряды — docs/API.md §13, разбор прототипа — docs/CRM.md §3.3.
 *
 * Внутренний раздел панели: наружу наряды не отдаются нигде. Здесь адреса,
 * телефоны и деньги, поэтому 🔴 разграничение по роли живёт в этом файле, а не
 * в разметке: скрытая колонка — подсказка интерфейса, а не защита (CRM.md §6).
 *
 * Монтажник получает только свои наряды и не получает закрытых полей — их не
 * приводят к `null`, а не кладут в ответ вовсе: `null` сообщал бы, что поле
 * есть и оно пустое, а знать даже этого ему не положено.
 */
import { Prisma } from '@prisma/client';
import type {
  Employment as DbEmployment,
  OrderEquip as DbEquip,
  OrderStatus as DbStatus,
  OrderType as DbType,
  PaymentMode as DbPayment,
  UnitSource as DbSource,
} from '@prisma/client';
import { z } from 'zod';

import {
  installerMaySetStatus,
  TAB_STATUSES,
  type OrderCard,
  type OrderCreate,
  type OrderEquip,
  type OrderPeriod,
  type OrderStatus,
  type OrderTab,
  type OrderType,
  type OrderUnitCard,
  type OrderUnitInput,
  type OrderUpdate,
  type PaymentMode,
  type UnitSource,
} from '@/entities/order/model';
import type { AdminRole } from '@/entities/staff/model';
import { momentOf, monthKeyOf, shiftMonth, type MonthKey } from '@/shared/lib/calendar';
import type { Employment } from '@/shared/lib/employment';
import { pageWindow, type Page } from '@/shared/lib/paging';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';

// ---------- Словари: база ↔ контракт ----------

const TYPE_TO_DB: Record<OrderType, DbType> = {
  install: 'INSTALL',
  service: 'SERVICE',
  repair: 'REPAIR',
};

const TYPE_FROM_DB: Record<DbType, OrderType> = {
  INSTALL: 'install',
  SERVICE: 'service',
  REPAIR: 'repair',
};

const STATUS_TO_DB: Record<OrderStatus, DbStatus> = {
  new: 'NEW',
  assigned: 'ASSIGNED',
  in_progress: 'IN_PROGRESS',
  done: 'DONE',
  cancelled: 'CANCELLED',
};

const STATUS_FROM_DB: Record<DbStatus, OrderStatus> = {
  NEW: 'new',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

const PAYMENT_TO_DB: Record<PaymentMode, DbPayment> = {
  company: 'COMPANY',
  cash_to_installer: 'CASH_TO_INSTALLER',
};

const PAYMENT_FROM_DB: Record<DbPayment, PaymentMode> = {
  COMPANY: 'company',
  CASH_TO_INSTALLER: 'cash_to_installer',
};

const EQUIP_TO_DB: Record<OrderEquip, DbEquip> = {
  conditioner: 'CONDITIONER',
  fridge: 'FRIDGE',
  compressor: 'COMPRESSOR',
  ventilation: 'VENTILATION',
  heat_curtain: 'HEAT_CURTAIN',
  other: 'OTHER',
};

const EQUIP_FROM_DB: Record<DbEquip, OrderEquip> = {
  CONDITIONER: 'conditioner',
  FRIDGE: 'fridge',
  COMPRESSOR: 'compressor',
  VENTILATION: 'ventilation',
  HEAT_CURTAIN: 'heat_curtain',
  OTHER: 'other',
};

const SOURCE_TO_DB: Record<UnitSource, DbSource> = { ours: 'OURS', client: 'CLIENT' };

const SOURCE_FROM_DB: Record<DbSource, UnitSource> = { OURS: 'ours', CLIENT: 'client' };

const EMPLOYMENT_FROM_DB: Record<DbEmployment, Employment> = {
  SELF_EMPLOYED: 'self_employed',
  CONTRACT: 'contract',
  STAFF: 'staff',
};

// ---------- Чтение ----------

const unitSelect = {
  id: true,
  equip: true,
  model: true,
  source: true,
  trassaM: true,
  diameter: true,
  shtrob: true,
  sort: true,
} as const;

/**
 * `login` монтажника отдаётся рядом с именем: имя необязательно, и наряд без
 * подписи исполнителя выглядит неназначенным. `employment` нужен карточке —
 * от него зависит, чем является удержание (CRM.md §9).
 */
const orderSelect = {
  id: true,
  number: true,
  type: true,
  status: true,
  client: { select: { id: true, name: true, phone: true } },
  installer: { select: { id: true, name: true, login: true, employment: true } },
  at: true,
  durationMin: true,
  address: true,
  intercom: true,
  phone2: true,
  floor: true,
  heightWorks: true,
  payment: true,
  price: true,
  installerFee: true,
  deductionSum: true,
  deductionReason: true,
  comment: true,
  ownerNote: true,
  leadId: true,
  units: { select: unitSelect, orderBy: { sort: 'asc' } },
  createdAt: true,
} as const;

type OrderUnitRow = {
  id: string;
  equip: DbEquip;
  model: string | null;
  source: DbSource;
  trassaM: number | null;
  diameter: string | null;
  shtrob: boolean;
  sort: number;
};

type OrderRow = {
  id: string;
  number: number;
  type: DbType;
  status: DbStatus;
  client: { id: string; name: string; phone: string };
  installer: {
    id: string;
    name: string | null;
    login: string;
    employment: DbEmployment | null;
  } | null;
  at: Date;
  durationMin: number;
  address: string;
  intercom: string | null;
  phone2: string | null;
  floor: number | null;
  heightWorks: boolean;
  payment: DbPayment;
  price: number;
  installerFee: number;
  deductionSum: number;
  deductionReason: string | null;
  comment: string | null;
  ownerNote: string | null;
  leadId: string | null;
  units: readonly OrderUnitRow[];
  createdAt: Date;
};

function toUnitCard(row: OrderUnitRow): OrderUnitCard {
  return {
    id: row.id,
    equip: EQUIP_FROM_DB[row.equip],
    model: row.model,
    source: SOURCE_FROM_DB[row.source],
    trassaM: row.trassaM,
    diameter: row.diameter,
    shtrob: row.shtrob,
    sort: row.sort,
  };
}

/**
 * 🔴 Проекция наряда под роль смотрящего.
 *
 * Владельцу — всё. Монтажнику `ownerNote`, `deductionSum` и `deductionReason`
 * не кладутся вовсе, а `price` — только при оплате наличными: там сумму нужно
 * принять от клиента, во всех остальных случаях она его не касается.
 * `installerFee` он видит всегда — это его деньги (docs/API.md §13).
 */
function toCard(row: OrderRow, role: AdminRole): OrderCard {
  const payment = PAYMENT_FROM_DB[row.payment];

  const shared = {
    id: row.id,
    number: row.number,
    type: TYPE_FROM_DB[row.type],
    status: STATUS_FROM_DB[row.status],
    client: row.client,
    installer:
      row.installer === null
        ? null
        : {
            id: row.installer.id,
            name: row.installer.name,
            login: row.installer.login,
            employment:
              row.installer.employment === null
                ? null
                : EMPLOYMENT_FROM_DB[row.installer.employment],
          },
    at: row.at.toISOString(),
    durationMin: row.durationMin,
    address: row.address,
    intercom: row.intercom,
    phone2: row.phone2,
    floor: row.floor,
    heightWorks: row.heightWorks,
    payment,
    installerFee: row.installerFee,
    comment: row.comment,
    leadId: row.leadId,
    units: row.units.map(toUnitCard),
    createdAt: row.createdAt.toISOString(),
  };

  if (role === 'owner') {
    return {
      ...shared,
      price: row.price,
      deductionSum: row.deductionSum,
      deductionReason: row.deductionReason,
      ownerNote: row.ownerNote,
    };
  }

  return { ...shared, ...(payment === 'cash_to_installer' ? { price: row.price } : {}) };
}

// ---------- Список ----------

/** Кто смотрит: от этого зависит и набор нарядов, и набор полей в каждом. */
export type Viewer = { readonly role: AdminRole; readonly userId: string };

export type OrderListParams = {
  readonly query?: string | undefined;
  readonly tab?: OrderTab | undefined;
  readonly period?: OrderPeriod | undefined;
  readonly page?: number | undefined;
};

/**
 * 🔴 Монтажник видит только свои наряды.
 *
 * Условие подмешивается в запрос, а не отсеивается после выборки: иначе
 * страница из восьми записей у монтажника оказывалась бы то полной, то
 * пустой — в зависимости от того, чьи наряды попали в окно.
 */
function viewerWhere(viewer: Viewer): Prisma.OrderWhereInput {
  return viewer.role === 'installer' ? { installerId: viewer.userId } : {};
}

function tabWhere(tab: OrderTab): Prisma.OrderWhereInput {
  if (tab === 'all') return {};
  return { status: { in: TAB_STATUSES[tab].map((status) => STATUS_TO_DB[status]) } };
}

/** Полночь дня — граница периода в поясе работ, а не в поясе сервера. */
const DAY_START = '00:00';

function monthRange(month: MonthKey): { readonly gte: Date; readonly lt: Date } {
  return {
    gte: momentOf(`${month}-01`, DAY_START),
    lt: momentOf(`${shiftMonth(month, 1)}-01`, DAY_START),
  };
}

/**
 * Границы месяца считаются календарём в поясе работ, а не `getMonth()`
 * сервера: контейнер живёт в UTC, и первые три часа месяца по московскому
 * времени попадали бы в прошлый.
 */
function periodWhere(period: OrderPeriod, now: Date): Prisma.OrderWhereInput {
  if (period === 'all') return {};

  const current = monthKeyOf(now);
  const month = period === 'month' ? current : shiftMonth(current, -1);

  return { at: monthRange(month) };
}

/** Номер наряда владелец диктует и ищет как «№ 1059» — знак и пробел лишние. */
const NUMBER_QUERY = /^№?\s*(\d{1,9})$/;

/**
 * Поиск одной строкой: номер, имя клиента, адрес и модель в позициях.
 *
 * Номер добавляется в поиск, только когда строка целиком похожа на номер:
 * иначе «12» в адресе «Первомайская, 12» приводило бы наряд № 12 в выдачу
 * рядом с домом 12 и объяснить это владельцу было бы нечем.
 */
function searchWhere(query: string): Prisma.OrderWhereInput {
  const text = query.trim();
  if (text === '') return {};

  const digits = NUMBER_QUERY.exec(text)?.[1];
  const byNumber =
    digits === undefined
      ? []
      : [{ number: Number.parseInt(digits, 10) } satisfies Prisma.OrderWhereInput];

  return {
    OR: [
      ...byNumber,
      { client: { name: { contains: text, mode: 'insensitive' } } },
      { address: { contains: text, mode: 'insensitive' } },
      { units: { some: { model: { contains: text, mode: 'insensitive' } } } },
    ],
  };
}

/**
 * Ближайшие первыми там, где по наряду ещё предстоит ехать: список активных —
 * это план на ближайшие дни, и позапрошлый выезд в его начале бесполезен.
 * История и отказы читаются наоборот: сверху то, что закончилось последним.
 */
function orderDirection(tab: OrderTab): Prisma.SortOrder {
  return tab === 'history' || tab === 'cancelled' ? 'desc' : 'asc';
}

/**
 * Страница списка нарядов.
 *
 * С `take`, а не «все за всё время»: за годы работы список растёт без потолка,
 * и запрос без границы однажды кладёт панель вместе с базой. Номер страницы
 * приходит из адреса и прижимается к последней существующей (`pageWindow`).
 */
export async function list(params: OrderListParams, viewer: Viewer): Promise<Page<OrderCard>> {
  const tab = params.tab ?? 'active';

  const where: Prisma.OrderWhereInput = {
    ...viewerWhere(viewer),
    ...tabWhere(tab),
    ...periodWhere(params.period ?? 'all', new Date()),
    ...searchWhere(params.query ?? ''),
  };

  const total = await db.order.count({ where });
  const { page, pages, skip, take } = pageWindow(total, params.page ?? 1);

  const rows = await db.order.findMany({
    where,
    select: orderSelect,
    orderBy: { at: orderDirection(tab) },
    skip,
    take,
  });

  return { items: rows.map((row) => toCard(row, viewer.role)), total, page, pages };
}

/**
 * Карточка наряда.
 *
 * 🔴 Чужой наряд монтажнику не просто закрыт — его для монтажника нет:
 * фильтр по исполнителю стоит в самом запросе, и вызывающий получает `null`,
 * из которого маршрут делает `404`. `403` подтвердил бы, что наряд с таким
 * адресом существует (docs/API.md §13).
 */
export async function findById(id: string, viewer: Viewer): Promise<OrderCard | null> {
  const row = await db.order.findFirst({
    where: { id, ...viewerWhere(viewer) },
    select: orderSelect,
  });

  return row === null ? null : toCard(row, viewer.role);
}

/** Сколько работ в работе — цифра сводки панели. */
export async function countActive(): Promise<number> {
  return db.order.count({
    where: { status: { in: TAB_STATUSES.active.map((status) => STATUS_TO_DB[status]) } },
  });
}

// ---------- Запись ----------

/**
 * Несуществующий клиент или монтажник — ошибка ввода, а не сбой.
 *
 * Без проверки Prisma отвечает нарушением внешнего ключа, и человек видит
 * «не получилось обработать запрос» вместо подсказки, какое поле исправить.
 */
async function assertRefs(
  clientId: string | undefined,
  installerId: string | null | undefined,
): Promise<void> {
  if (clientId !== undefined) {
    const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (client === null) {
      throw new ApiException('validation_error', 'Такого клиента нет в базе', 'clientId');
    }
  }

  if (installerId !== undefined && installerId !== null) {
    const installer = await db.adminUser.findUnique({
      where: { id: installerId },
      select: { id: true },
    });
    if (installer === null) {
      throw new ApiException('validation_error', 'Такого монтажника нет в базе', 'installerId');
    }
  }
}

function unitData(unit: OrderUnitInput, index: number): Prisma.OrderUnitCreateWithoutOrderInput {
  return {
    equip: EQUIP_TO_DB[unit.equip],
    model: unit.model,
    source: SOURCE_TO_DB[unit.source],
    trassaM: unit.trassaM,
    diameter: unit.diameter,
    shtrob: unit.shtrob,
    // Порядок задаёт форма: позиции перетаскивают, а не нумеруют руками.
    sort: index,
  };
}

/** Ключ счётчика номеров в `Setting` — docs/API.md §13, CRM.md §4. */
const ORDER_SEQ_KEY = 'orderSeq';

/**
 * Первый наряд — № 1.
 *
 * Начинать с тысячи, чтобы «выглядело солиднее», нельзя по той же причине, по
 * которой на сайте нет выдуманного счётчика выполненных работ (инвариант 10):
 * номер называют клиенту, и он сообщает ему ровно то, чего не было. Владельцу,
 * который продолжает нумерацию бумажного журнала, менять код не нужно —
 * счётчик лежит в `Setting`, и стартовое значение задаётся записью в базе.
 */
const FIRST_ORDER_NUMBER = 1;

/** Значение из `Setting` приходит как JSON — доверять ему без проверки нельзя. */
const orderSeqSchema = z.number().int().min(0);

async function nextNumber(tx: Prisma.TransactionClient): Promise<number> {
  const row = await tx.setting.findUnique({ where: { key: ORDER_SEQ_KEY } });
  const stored = orderSeqSchema.safeParse(row?.value);
  const number = stored.success ? stored.data + 1 : FIRST_ORDER_NUMBER;

  await tx.setting.upsert({
    where: { key: ORDER_SEQ_KEY },
    create: { key: ORDER_SEQ_KEY, value: number },
    update: { value: number },
  });

  return number;
}

/**
 * 🔴 Номер выдаётся в той же транзакции, что и вставка наряда.
 *
 * Автоинкремент Postgres не годится: он оставляет дыру на каждой откатанной
 * транзакции, а владелец диктует номер клиенту по телефону и ждёт от
 * нумерации непрерывности (CRM.md §4).
 */
async function createRow(input: OrderCreate): Promise<OrderRow> {
  return db.$transaction(async (tx) => {
    const number = await nextNumber(tx);

    return tx.order.create({
      data: {
        number,
        type: TYPE_TO_DB[input.type],
        /* «Новый» по схеме означает «исполнитель не назначен»: наряд, который
           сразу завели на человека, — уже назначенный, и висеть во вкладке
           «Новые» ему незачем. */
        status: input.installerId === null ? 'NEW' : 'ASSIGNED',
        clientId: input.clientId,
        installerId: input.installerId,
        at: momentOf(input.day, input.time),
        durationMin: input.durationMin,
        address: input.address,
        intercom: input.intercom,
        phone2: input.phone2,
        floor: input.floor,
        heightWorks: input.heightWorks,
        payment: PAYMENT_TO_DB[input.payment],
        price: input.price,
        installerFee: input.installerFee,
        deductionSum: input.deductionSum,
        deductionReason: input.deductionReason,
        comment: input.comment,
        ownerNote: input.ownerNote,
        leadId: input.leadId,
        units: { create: input.units.map(unitData) },
      },
      select: orderSelect,
    });
  });
}

/**
 * Заводит наряд. Всегда от лица владельца: монтажнику маршрут закрыт целиком,
 * поэтому карточка собирается по полной проекции.
 *
 * Повтор при гонке за номером: две транзакции, начатые одновременно, читают
 * один и тот же счётчик, и вторая упирается в `@unique` на `number` (P2002).
 * Повтор перечитывает счётчик и берёт следующий. Одного достаточно: наряды
 * заводит один человек, а не толпа.
 */
export async function create(input: OrderCreate): Promise<OrderCard> {
  await assertRefs(input.clientId, input.installerId);

  try {
    return toCard(await createRow(input), 'owner');
  } catch (error) {
    const numberRace =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
    if (!numberRace) throw error;

    return toCard(await createRow(input), 'owner');
  }
}

type DeductionState = { readonly deductionSum: number; readonly deductionReason: string | null };

/**
 * 🔴 Досмотр связки «сумма удержания без основания» на уже собранной записи.
 *
 * Схема правки видит только присланные поля и поэтому пропускает две дыры:
 * сумму при пустом сохранённом основании и снятие основания при сохранённой
 * сумме. Сумма без причины через полгода не значит ничего — ни для владельца,
 * ни для разговора с человеком, у которого её удержали (CRM.md §9).
 */
function assertDeduction(current: DeductionState, input: OrderUpdate): void {
  const sum = input.deductionSum ?? current.deductionSum;
  const reason =
    input.deductionReason === undefined ? current.deductionReason : input.deductionReason;

  if (sum > 0 && reason === null) {
    throw new ApiException('validation_error', 'Укажите основание удержания', 'deductionReason');
  }
}

/**
 * Статус после правки.
 *
 * Явно присланный статус выигрывает всегда. Если его не прислали, но сменился
 * исполнитель, статус подтягивается за ним: наряд с монтажником не остаётся
 * «Новым», а снятый с исполнителя не остаётся «Назначенным» — иначе вкладки
 * списка врут о том, что происходит с работой.
 */
function nextStatus(
  current: { readonly status: DbStatus },
  input: OrderUpdate,
): DbStatus | undefined {
  if (input.status !== undefined) return STATUS_TO_DB[input.status];
  if (input.installerId === undefined) return undefined;

  if (input.installerId !== null && current.status === 'NEW') return 'ASSIGNED';
  if (input.installerId === null && current.status === 'ASSIGNED') return 'NEW';

  return undefined;
}

/**
 * Правка наряда владельцем. Любое подмножество полей; непереданное не
 * затирается.
 *
 * Позиции, если они пришли, заменяются целиком — так же, как строки прайса
 * (docs/API.md §4): отдельных маршрутов у позиции нет, и «дописать одну»
 * означало бы вторую модель редактирования того же списка.
 */
export async function update(id: string, input: OrderUpdate): Promise<OrderCard> {
  const current = await db.order.findUnique({
    where: { id },
    select: { status: true, deductionSum: true, deductionReason: true },
  });
  if (current === null) throw new ApiException('not_found', 'Наряд не найден');

  await assertRefs(input.clientId, input.installerId);
  assertDeduction(current, input);

  const status = nextStatus(current, input);
  /* Схема гарантирует, что день и время приходят только вместе: перенести
     работу на другой день, не сказав на какое время, нельзя. */
  const at =
    input.day === undefined || input.time === undefined
      ? undefined
      : momentOf(input.day, input.time);

  const row = await db.$transaction(async (tx) => {
    if (input.units !== undefined) {
      await tx.orderUnit.deleteMany({ where: { orderId: id } });
      await tx.orderUnit.createMany({
        data: input.units.map((unit, index) => ({ orderId: id, ...unitData(unit, index) })),
      });
    }

    return tx.order.update({
      where: { id },
      data: {
        ...(input.type === undefined ? {} : { type: TYPE_TO_DB[input.type] }),
        ...(status === undefined ? {} : { status }),
        ...(input.clientId === undefined ? {} : { clientId: input.clientId }),
        ...(input.installerId === undefined ? {} : { installerId: input.installerId }),
        ...(at === undefined ? {} : { at }),
        ...(input.durationMin === undefined ? {} : { durationMin: input.durationMin }),
        ...(input.address === undefined ? {} : { address: input.address }),
        ...(input.intercom === undefined ? {} : { intercom: input.intercom }),
        ...(input.phone2 === undefined ? {} : { phone2: input.phone2 }),
        ...(input.floor === undefined ? {} : { floor: input.floor }),
        ...(input.heightWorks === undefined ? {} : { heightWorks: input.heightWorks }),
        ...(input.payment === undefined ? {} : { payment: PAYMENT_TO_DB[input.payment] }),
        ...(input.price === undefined ? {} : { price: input.price }),
        ...(input.installerFee === undefined ? {} : { installerFee: input.installerFee }),
        ...(input.deductionSum === undefined ? {} : { deductionSum: input.deductionSum }),
        ...(input.deductionReason === undefined ? {} : { deductionReason: input.deductionReason }),
        ...(input.comment === undefined ? {} : { comment: input.comment }),
        ...(input.ownerNote === undefined ? {} : { ownerNote: input.ownerNote }),
        ...(input.leadId === undefined ? {} : { leadId: input.leadId }),
      },
      select: orderSelect,
    });
  });

  return toCard(row, 'owner');
}

/**
 * 🔴 Смена статуса монтажником.
 *
 * Три проверки, и все на сервере: переход разрешён монтажнику вообще, наряд
 * назначен именно ему, наряд ещё не закрыт. Назначение, отказ и возврат в
 * работу — решения владельца: монтажник, закрывающий чужой наряд отказом,
 * ломает и деньги, и график (CRM.md §6).
 */
export async function setStatusByInstaller(
  id: string,
  installerId: string,
  status: OrderStatus,
): Promise<OrderCard> {
  if (!installerMaySetStatus(status)) {
    throw new ApiException('forbidden', 'Такой переход монтажнику недоступен');
  }

  const current = await db.order.findUnique({
    where: { id },
    select: { installerId: true, status: true },
  });

  /* Чужой наряд для монтажника не существует: `404`, а не `403`, — иначе
     отказ сам подтверждал бы, что наряд с таким адресом есть. */
  if (current === null || current.installerId !== installerId) {
    throw new ApiException('not_found', 'Наряд не найден');
  }

  if (current.status === 'DONE' || current.status === 'CANCELLED') {
    throw new ApiException(
      'forbidden',
      'Наряд закрыт — вернуть его в работу может только владелец',
    );
  }

  const row = await db.order.update({
    where: { id },
    data: { status: STATUS_TO_DB[status] },
    select: orderSelect,
  });

  return toCard(row, 'installer');
}

/** Удаление наряда. Позиции уходят каскадом — своей жизни у них нет. */
export async function remove(id: string): Promise<void> {
  const removed = await db.order.deleteMany({ where: { id } });
  if (removed.count === 0) throw new ApiException('not_found', 'Наряд не найден');
}
