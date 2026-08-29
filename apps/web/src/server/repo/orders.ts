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
  OrderDocKind as DbDocKind,
  OrderEquip as DbEquip,
  OrderStatus as DbStatus,
  OrderType as DbType,
  PaymentMode as DbPayment,
  PhotoStage as DbStage,
  UnitSource as DbSource,
} from '@prisma/client';
import { z } from 'zod';

import {
  buildChecklist,
  planChecklist,
  type ChecklistSource,
} from '@/entities/order/lib/checklist';
import {
  ORDER_HISTORY_TEXT,
  orderAssignHistory,
  orderResultHistory,
  orderStatusHistory,
} from '@/entities/order/lib/history';
import {
  installerMaySetStatus,
  orderPairIssue,
  TAB_STATUSES,
  type OrderCard,
  type OrderChecklistCard,
  type OrderCreate,
  type OrderDetails,
  type OrderDocCard,
  type OrderDocKind,
  type OrderEquip,
  type OrderHistoryEntry,
  type OrderPeriod,
  type OrderPhotoCard,
  type OrderResultInput,
  type OrderStatus,
  type OrderTab,
  type OrderType,
  type OrderUnitCard,
  type OrderUnitInput,
  type OrderUpdate,
  type PaymentMode,
  type PhotoStage,
  type UnitSource,
} from '@/entities/order/model';
import { overtimeMinutes } from '@/entities/crm/lib/overtime';
import type { AdminRole } from '@/entities/staff/model';
import { momentOf, monthKeyOf, shiftMonth, type MonthKey } from '@/shared/lib/calendar';
import { pageWindow, type Page } from '@/shared/lib/paging';
import * as clientUnits from '@/server/repo/client-units';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import { employmentFromDb } from '@/server/repo/employment';
import { workWindow } from '@/server/repo/settings';

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

/* Словари документа и этапа съёмки экспортируются ради `repo/order-files`:
   разворачивает их в базу он, но источник правды один. */
export const DOC_KIND_TO_DB: Record<OrderDocKind, DbDocKind> = {
  contract: 'CONTRACT',
  warranty: 'WARRANTY',
  act: 'ACT',
  invoice: 'INVOICE',
  measure: 'MEASURE',
  other: 'OTHER',
};

const DOC_KIND_FROM_DB: Record<DbDocKind, OrderDocKind> = {
  CONTRACT: 'contract',
  WARRANTY: 'warranty',
  ACT: 'act',
  INVOICE: 'invoice',
  MEASURE: 'measure',
  OTHER: 'other',
};

export const STAGE_TO_DB: Record<PhotoStage, DbStage> = { before: 'BEFORE', after: 'AFTER' };

export const STAGE_FROM_DB: Record<DbStage, PhotoStage> = { BEFORE: 'before', AFTER: 'after' };

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
  overtimeMin: true,
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
  extraWork: true,
  report: true,
  resultAt: true,
  units: { select: unitSelect, orderBy: { sort: 'asc' } },
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Карточка наряда — то же плюс всё, что нажито работой.
 *
 * Отдельно от списка: восемь нарядов с историей, чеклистом и документами
 * тянули бы за собой пять таблиц ради страницы, на которой ничего этого не
 * видно.
 */
const detailsSelect = {
  ...orderSelect,
  checklist: {
    select: { id: true, text: true, done: true, own: true, sort: true },
    orderBy: { sort: 'asc' },
  },
  docs: {
    select: { id: true, kind: true, name: true, url: true, sizeBytes: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  },
  /* Порядок один на оба этапа: «до» и «после» разводит по колонкам карточка,
     а сортировка двумя ключами здесь стоила бы кортежа в `as const`. */
  photos: { select: { id: true, stage: true, url: true, sort: true }, orderBy: { sort: 'asc' } },
  history: {
    select: {
      id: true,
      text: true,
      createdAt: true,
      author: { select: { name: true, login: true } },
    },
    orderBy: { createdAt: 'desc' },
  },
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
  overtimeMin: number;
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
  extraWork: string | null;
  report: string | null;
  resultAt: Date | null;
  units: readonly OrderUnitRow[];
  createdAt: Date;
  updatedAt: Date;
};

type ChecklistRow = {
  id: string;
  text: string;
  done: boolean;
  own: boolean;
  sort: number;
};

type DocRow = {
  id: string;
  kind: DbDocKind;
  name: string;
  url: string;
  sizeBytes: number;
  createdAt: Date;
};

type PhotoRow = { id: string; stage: DbStage; url: string; sort: number };

type HistoryRow = {
  id: string;
  text: string;
  createdAt: Date;
  author: { name: string | null; login: string } | null;
};

type OrderDetailsRow = OrderRow & {
  checklist: readonly ChecklistRow[];
  docs: readonly DocRow[];
  photos: readonly PhotoRow[];
  history: readonly HistoryRow[];
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
            employment: employmentFromDb(row.installer.employment),
          },
    at: row.at.toISOString(),
    durationMin: row.durationMin,
    /* Переработка — часы человека, а не деньги компании: она приходит обеим
       ролям наравне с `installerFee`. Монтажник видит свои минуты, и знать
       их ему положено (ADR-138). */
    overtimeMin: row.overtimeMin,
    address: row.address,
    intercom: row.intercom,
    phone2: row.phone2,
    floor: row.floor,
    heightWorks: row.heightWorks,
    payment,
    installerFee: row.installerFee,
    comment: row.comment,
    leadId: row.leadId,
    /* Итог приходит обеим ролям: это отчёт монтажника о выезде, и он же его
       заполняет — прятать от него собственный текст незачем. */
    extraWork: row.extraWork,
    report: row.report,
    resultAt: row.resultAt === null ? null : row.resultAt.toISOString(),
    units: row.units.map(toUnitCard),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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

/**
 * 🔴 Адрес документа — закрытый маршрут панели, а не файл в томе загрузок.
 *
 * Договоры и акты — персональные данные клиента. Публичный `/api/media/{name}`
 * отдаёт файл всякому, кто знает имя, и для них не годится: выдача обязана
 * сверять сессию и принадлежность документа наряду (docs/CRM.md §9).
 */
export function orderDocUrl(orderId: string, docId: string): string {
  return `/api/admin/orders/${orderId}/docs/${docId}/file`;
}

export function toChecklistCard(row: ChecklistRow): OrderChecklistCard {
  return { id: row.id, text: row.text, done: row.done, own: row.own, sort: row.sort };
}

export function toDocCard(orderId: string, row: DocRow): OrderDocCard {
  return {
    id: row.id,
    kind: DOC_KIND_FROM_DB[row.kind],
    name: row.name,
    url: orderDocUrl(orderId, row.id),
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * 🔴 Адрес снимка наряда — тоже закрытый.
 *
 * Снимки «до/после» — это интерьер квартиры клиента, такие же персональные
 * данные, как договор рядом. Асимметрия, при которой договор ходил через
 * сессию, а снимок отдавался всякому, кто знает имя файла, снята (ADR-171).
 */
export function orderPhotoUrl(orderId: string, photoId: string): string {
  return `/api/admin/orders/${orderId}/photos/${photoId}/file`;
}

export function toPhotoCard(orderId: string, row: PhotoRow): OrderPhotoCard {
  return {
    id: row.id,
    stage: STAGE_FROM_DB[row.stage],
    url: orderPhotoUrl(orderId, row.id),
    sort: row.sort,
  };
}

function toHistoryEntry(row: HistoryRow): OrderHistoryEntry {
  return {
    id: row.id,
    text: row.text,
    /* Логин как запасная подпись: у заведённой второпях учётной записи имени
       может не быть, а запись без автора читается как сделанная системой. */
    author: row.author === null ? null : (row.author.name ?? row.author.login),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * 🔴 Карточка наряда под роль смотрящего.
 *
 * Чеклист, документы и фото приходят обеим ролям: это рабочий экран выезда.
 * История — только владельцу: в ней лежат переназначения, то есть разговор
 * владельца с людьми, а не работа монтажника (docs/CRM.md §6). Ключа `history`
 * в ответе монтажника нет вовсе — как и у заметки владельца.
 */
function toDetails(row: OrderDetailsRow, role: AdminRole): OrderDetails {
  const shared = {
    ...toCard(row, role),
    checklist: row.checklist.map(toChecklistCard),
    docs: row.docs.map((doc) => toDocCard(row.id, doc)),
    photos: row.photos.map((photo) => toPhotoCard(row.id, photo)),
  };

  if (role === 'owner') return { ...shared, history: row.history.map(toHistoryEntry) };

  return shared;
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
export async function findById(id: string, viewer: Viewer): Promise<OrderDetails | null> {
  const row = await db.order.findFirst({
    where: { id, ...viewerWhere(viewer) },
    select: detailsSelect,
  });

  return row === null ? null : toDetails(row, viewer.role);
}

/**
 * 🔴 Наряд, доступный смотрящему, — общая проверка для всего, что к наряду
 * прикладывается: чеклиста, документов и фотографий.
 *
 * Тот же фильтр по исполнителю в самом запросе, что и у карточки: чужой наряд
 * не отдаёт ни своих файлов, ни своего чеклиста, и отвечает `404`, а не
 * `403`, — существование чужого наряда монтажника не касается (ADR-114).
 */
export type OrderAccess = {
  readonly id: string;
  readonly installerId: string | null;
  readonly status: DbStatus;
};

export async function requireAccess(id: string, viewer: Viewer): Promise<OrderAccess> {
  const row = await db.order.findFirst({
    where: { id, ...viewerWhere(viewer) },
    select: { id: true, installerId: true, status: true },
  });

  if (row === null) throw new ApiException('not_found', 'Наряд не найден');

  return row;
}

/** Сколько работ в работе — цифра сводки панели. */
export async function countActive(): Promise<number> {
  return db.order.count({
    where: { status: { in: TAB_STATUSES.active.map((status) => STATUS_TO_DB[status]) } },
  });
}

// ---------- Запись ----------

/** Ссылки наряда на чужие сущности: все три проверяются одинаково. */
type OrderRefs = {
  readonly clientId?: string | undefined;
  readonly installerId?: string | null | undefined;
  readonly leadId?: string | null | undefined;
};

/**
 * Несуществующий клиент, монтажник или обращение — ошибка ввода, а не сбой.
 *
 * Без проверки Prisma отвечает нарушением внешнего ключа (`P2003`), а
 * `handleRouteError` превращает его в 500 «не получилось обработать запрос»:
 * человек видит отказ сервера вместо подсказки, какое поле исправить.
 *
 * `keepInstaller` — исполнитель, уже стоящий в наряде. Он не перепроверяется
 * на активность: человек уволился, но со своих прошлых нарядов не исчез, и
 * правка адреса такого наряда не должна упираться в его увольнение.
 */
async function assertRefs(
  refs: OrderRefs,
  keepInstaller: string | null = null,
): Promise<string | null> {
  if (refs.clientId !== undefined) {
    const client = await db.client.findUnique({
      where: { id: refs.clientId },
      select: { id: true },
    });
    if (client === null) {
      throw new ApiException('validation_error', 'Такого клиента нет в базе', 'clientId');
    }
  }

  if (refs.leadId !== undefined && refs.leadId !== null) {
    const lead = await db.lead.findUnique({ where: { id: refs.leadId }, select: { id: true } });
    if (lead === null) {
      throw new ApiException('validation_error', 'Такого обращения нет в базе', 'leadId');
    }
  }

  const installerId = refs.installerId;
  if (installerId === undefined || installerId === null) return null;

  const installer = await db.adminUser.findUnique({
    where: { id: installerId },
    select: { id: true, name: true, login: true, active: true },
  });
  if (installer === null) {
    throw new ApiException('validation_error', 'Такого монтажника нет в базе', 'installerId');
  }

  /* 🔴 Отключённая учётная запись в панель не заходит, а значит не увидит и
     наряда: назначить на неё работу — это назначить её в никуда. Форма
     предлагает только активных, но маршрут открыт и мимо формы. */
  if (!installer.active && installerId !== keepInstaller) {
    throw new ApiException(
      'validation_error',
      'Эта учётная запись отключена: выберите другого исполнителя',
      'installerId',
    );
  }

  /* Имя возвращается наверх, а не читается второй раз при записи истории:
     «Назначен: Дмитрий Соколов» и проверка «такой монтажник есть» — один и
     тот же поход в базу. */
  return installer.name ?? installer.login;
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

// ---------- История и чеклист ----------

/**
 * 🔴 История пишется тем же кодом, который меняет наряд, и в той же
 * транзакции.
 *
 * История, которую можно не записать, — это не история: наряд, сменивший
 * статус при упавшей вставке записи, через месяц выглядит так, будто им никто
 * не занимался (docs/CRM.md §3.3).
 */
async function writeHistory(
  tx: Prisma.TransactionClient,
  orderId: string,
  authorId: string,
  lines: readonly string[],
): Promise<void> {
  if (lines.length === 0) return;

  await tx.orderHistory.createMany({
    data: lines.map((text) => ({ orderId, authorId, text })),
  });
}

/**
 * Наряд глазами сборки чеклиста: ровно те поля, из которых он собирается.
 *
 * Тип структурный, а не `OrderRow`: пересборке кнопкой незачем поднимать из
 * базы клиента, деньги и заметки — ей нужны позиции и четыре поля наряда.
 */
export type ChecklistOrderRow = {
  readonly id: string;
  readonly type: DbType;
  readonly heightWorks: boolean;
  readonly payment: DbPayment;
  readonly price: number;
  readonly units: readonly {
    readonly equip: DbEquip;
    readonly model: string | null;
    readonly source: DbSource;
    readonly trassaM: number | null;
    readonly diameter: string | null;
    readonly shtrob: boolean;
  }[];
};

/** Словари базы разворачиваются в домен: считает список чистая функция. */
function checklistSourceOf(row: ChecklistOrderRow): ChecklistSource {
  return {
    type: TYPE_FROM_DB[row.type],
    heightWorks: row.heightWorks,
    payment: PAYMENT_FROM_DB[row.payment],
    price: row.price,
    units: row.units.map((unit) => ({
      equip: EQUIP_FROM_DB[unit.equip],
      model: unit.model,
      source: SOURCE_FROM_DB[unit.source],
      trassaM: unit.trassaM,
      diameter: unit.diameter,
      shtrob: unit.shtrob,
    })),
  };
}

/**
 * Пересборка чеклиста по данным наряда.
 *
 * 🔴 Экспортируется ради `repo/order-files`: пересобрать чеклист можно и
 * кнопкой, и правкой наряда, и обе дороги обязаны вести к одному расчёту.
 * Что именно сохраняется, а что заводится заново, решает чистая функция
 * домена — здесь только применение её плана.
 *
 * Работает на уже прочитанной записи, а не перечитывает наряд: и заведение, и
 * правка возвращают её из той же транзакции, и лишний запрос в базу ради
 * данных, которые уже в руках, был бы просто лишним.
 */
export async function applyChecklist(
  tx: Prisma.TransactionClient,
  order: ChecklistOrderRow,
): Promise<void> {
  const existing = await tx.orderChecklistItem.findMany({
    where: { orderId: order.id },
    orderBy: { sort: 'asc' },
    select: { id: true, text: true, own: true },
  });

  const plan = planChecklist(buildChecklist(checklistSourceOf(order)), existing);

  if (plan.remove.length > 0) {
    await tx.orderChecklistItem.deleteMany({ where: { id: { in: [...plan.remove] } } });
  }

  /* Порядок правится по одному: `updateMany` умеет ставить одно значение
     всем сразу, а здесь у каждого пункта своё место в списке. */
  for (const item of plan.keep) {
    await tx.orderChecklistItem.update({ where: { id: item.id }, data: { sort: item.sort } });
  }

  if (plan.create.length > 0) {
    await tx.orderChecklistItem.createMany({
      data: plan.create.map((item) => ({ orderId: order.id, text: item.text, sort: item.sort })),
    });
  }
}

/**
 * Правка задела чеклист: тип работ, высотные работы, оплата, сумма или
 * позиции. Всё остальное на список сборов не влияет, и трогать его незачем.
 *
 * Пересборка идёт сама, а не кнопкой: наряд, в который добавили вторую
 * позицию, обязан дать вторую трассу в чеклисте — иначе монтажник уедет с
 * материалами на один блок и узнает об этом на объекте. Отметки и дописанные
 * пункты при этом сохраняются (`planChecklist`).
 */
function touchesChecklist(input: OrderUpdate): boolean {
  return (
    input.type !== undefined ||
    input.heightWorks !== undefined ||
    input.payment !== undefined ||
    input.price !== undefined ||
    input.units !== undefined
  );
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
async function createRow(
  input: OrderCreate,
  authorId: string,
  installerName: string | null,
): Promise<OrderRow> {
  return db.$transaction(async (tx) => {
    const number = await nextNumber(tx);

    const row = await tx.order.create({
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
        /* Минуты за рабочим окном считаются при записи и хранятся числом:
           окно владелец меняет, а переработка прошлого выезда измениться не
           имеет права — на неё смотрят при расчётах с людьми (ADR-138). */
        overtimeMin: overtimeMinutes(
          momentOf(input.day, input.time),
          input.durationMin,
          await workWindow(),
        ),
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

    /* Первая запись истории — та же транзакция, что и сам наряд: заведение
       без автора и времени через полгода не отличить от чужой правки. */
    await writeHistory(tx, row.id, authorId, [
      ORDER_HISTORY_TEXT.created,
      ...(input.installerId === null ? [] : [orderAssignHistory(installerName)]),
    ]);

    /* Чеклист собирается сразу: наряд, заведённый вечером, монтажник
       открывает утром — и список сборов должен быть там уже готовым. */
    await applyChecklist(tx, row);

    return row;
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
/**
 * Минуты за рабочим окном при переносе наряда. Недостающую половину вводных
 * берём из самой записи: перенесли время, не тронув длительность, —
 * длительность осталась прежней (ADR-138).
 */
async function recomputedOvertime(
  id: string,
  at: Date | undefined,
  durationMin: number | undefined,
): Promise<number | null> {
  if (at === undefined && durationMin === undefined) return null;

  const current = await db.order.findUnique({
    where: { id },
    select: { at: true, durationMin: true },
  });
  if (current === null) return null;

  return overtimeMinutes(at ?? current.at, durationMin ?? current.durationMin, await workWindow());
}

export async function create(input: OrderCreate, authorId: string): Promise<OrderCard> {
  const installerName = await assertRefs(input);

  try {
    return toCard(await createRow(input, authorId, installerName), 'owner');
  } catch (error) {
    const numberRace =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
    if (!numberRace) throw error;

    return toCard(await createRow(input, authorId, installerName), 'owner');
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

/** Состояние наряда до правки: из него выводятся и статус, и записи истории. */
type CurrentOrder = {
  readonly status: DbStatus;
  readonly installerId: string | null;
  readonly deductionSum: number;
  readonly deductionReason: string | null;
};

/**
 * 🔴 Досмотр пары «статус + исполнитель» на уже собранной записи.
 *
 * Схема правки видит только присланные поля и поэтому пропускает половину
 * случаев: статус без исполнителя и исполнителя без статуса. Без этой
 * проверки наряд «Новый», которому назначили монтажника, оставался «Новым» —
 * навсегда во вкладке «Новые», хотя человек уже получил уведомление, — а
 * снятие исполнителя с наряда в работе оставляло `IN_PROGRESS` без
 * исполнителя, к которому у монтажника больше нет доступа.
 */
function assertStatusPair(
  current: CurrentOrder,
  input: OrderUpdate,
  status: DbStatus | undefined,
): void {
  const installerId = input.installerId === undefined ? current.installerId : input.installerId;
  const issue = orderPairIssue(STATUS_FROM_DB[status ?? current.status], installerId !== null);

  if (issue !== null) throw new ApiException('validation_error', issue.message, issue.field);
}

/**
 * Что записать в историю по итогам правки.
 *
 * Назначение и снятие исполнителя — своя запись; смена статуса — своя. Но
 * когда статус подтянулся за исполнителем сам (`assigned` при назначении),
 * второй строки не будет: «Назначен: Дмитрий Соколов» и «Назначен» подряд
 * читаются как сбой, а не как две новости.
 */
function updateHistory(
  current: CurrentOrder,
  input: OrderUpdate,
  status: DbStatus | undefined,
  installerName: string | null,
): readonly string[] {
  const lines: string[] = [];

  if (input.installerId !== undefined && input.installerId !== current.installerId) {
    lines.push(orderAssignHistory(input.installerId === null ? null : installerName));
  }

  const statusChanged = status !== undefined && status !== current.status;
  if (statusChanged && input.status !== undefined) {
    lines.push(orderStatusHistory(input.status));
  }

  return lines;
}

/**
 * Правка наряда владельцем. Любое подмножество полей; непереданное не
 * затирается.
 *
 * Позиции, если они пришли, заменяются целиком — так же, как строки прайса
 * (docs/API.md §4): отдельных маршрутов у позиции нет, и «дописать одну»
 * означало бы вторую модель редактирования того же списка.
 */
export async function update(id: string, input: OrderUpdate, authorId: string): Promise<OrderCard> {
  const current = await db.order.findUnique({
    where: { id },
    select: { status: true, installerId: true, deductionSum: true, deductionReason: true },
  });
  if (current === null) throw new ApiException('not_found', 'Наряд не найден');

  const installerName = await assertRefs(input, current.installerId);
  assertDeduction(current, input);

  const status = nextStatus(current, input);
  assertStatusPair(current, input, status);
  /* Схема гарантирует, что день и время приходят только вместе: перенести
     работу на другой день, не сказав на какое время, нельзя. */
  const at =
    input.day === undefined || input.time === undefined
      ? undefined
      : momentOf(input.day, input.time);

  /* Переработка пересчитывается, только когда двинулось время или
     длительность: правка адреса к ней отношения не имеет. */
  const overtime = await recomputedOvertime(id, at, input.durationMin);

  const row = await db.$transaction(async (tx) => {
    if (input.units !== undefined) {
      await tx.orderUnit.deleteMany({ where: { orderId: id } });
      await tx.orderUnit.createMany({
        data: input.units.map((unit, index) => ({ orderId: id, ...unitData(unit, index) })),
      });
    }

    /* 🔴 Запись под версию: `updateMany` с `updatedAt` в условии — это
       сравнение-и-запись одним запросом. Обычный `update` писал бы поверх
       чужой правки, а прочитать версию отдельным запросом и потом писать
       значит оставить между ними ту же щель, ради которой всё и затевалось.

       Приём в проекте не новый: так же захватывается попытка отправки
       уведомления (`notifications/runner.ts`) — условный `updateMany` плюс
       проверка счётчика. */
    const expected = input.updatedAt === undefined ? undefined : new Date(input.updatedAt);

    const data = {
      ...(input.type === undefined ? {} : { type: TYPE_TO_DB[input.type] }),
      ...(status === undefined ? {} : { status }),
      ...(input.clientId === undefined ? {} : { clientId: input.clientId }),
      ...(input.installerId === undefined ? {} : { installerId: input.installerId }),
      ...(at === undefined ? {} : { at }),
      ...(input.durationMin === undefined ? {} : { durationMin: input.durationMin }),
      ...(overtime === null ? {} : { overtimeMin: overtime }),
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
    };

    if (expected !== undefined) {
      const written = await tx.order.updateMany({ where: { id, updatedAt: expected }, data });

      if (written.count === 0) {
        throw new ApiException(
          'conflict',
          'Наряд за это время изменил кто-то другой. Обновите страницу и повторите правку',
        );
      }
    } else {
      await tx.order.update({ where: { id }, data });
    }

    const updated = await tx.order.findUniqueOrThrow({ where: { id }, select: orderSelect });

    /* 🔴 Выполненный монтаж становится техникой клиента (CRM.md §3.2): той же
       транзакцией, что и статус, иначе закрытый наряд и пустая карточка
       клиента расходятся молча. Функция не бросает из-за прикладных отказов —
       закрытие наряда не может упасть из-за ненаписанной строки о технике. */
    if (status === 'DONE') await clientUnits.fromCompletedOrder(id, tx);

    /* 🔴 История — в той же транзакции, что и правка: откатилась правка —
       откатилась и запись о ней. */
    await writeHistory(tx, id, authorId, updateHistory(current, input, status, installerName));

    if (touchesChecklist(input)) await applyChecklist(tx, updated);

    return updated;
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

  const row = await db.$transaction(async (tx) => {
    /* 🔴 Та же транзакция: «взял в работу» без записи о том, кто и когда его
       взял, — ровно та история, ради которой её и заводили. */
    await writeHistory(tx, id, installerId, [orderStatusHistory(status)]);

    const updated = await tx.order.update({
      where: { id },
      data: { status: STATUS_TO_DB[status] },
      select: orderSelect,
    });

    /* Монтажник закрывает наряд сам — техника клиента должна появиться и в
       этом случае, а не только когда владелец закроет его за него. */
    if (status === 'done') await clientUnits.fromCompletedOrder(id, tx);

    return updated;
  });

  return toCard(row, 'installer');
}

/**
 * 🔴 Итог работ: что сделали сверх наряда и отчёт о выезде.
 *
 * Заполняет и владелец, и монтажник — это его отчёт. Плановых полей итог не
 * трогает вовсе: сколько взять с клиента, решает владелец (docs/CRM.md §3.3),
 * и «дописал два метра трассы» не должно превращаться в другую цену заказа.
 *
 * Чужой наряд монтажнику недоступен и здесь — `requireAccess` не найдёт его и
 * ответит `404`, как и карточка.
 */
export async function setResult(
  id: string,
  input: OrderResultInput,
  viewer: Viewer,
): Promise<OrderDetails> {
  await requireAccess(id, viewer);

  const filled = input.extraWork !== null || input.report !== null;

  const row = await db.$transaction(async (tx) => {
    await writeHistory(tx, id, viewer.userId, [orderResultHistory(filled)]);

    return tx.order.update({
      where: { id },
      data: {
        extraWork: input.extraWork,
        report: input.report,
        /* Время итога ставит сервер: «когда заполнен» — это факт, а не поле
           формы, и часы на телефоне монтажника к нему отношения не имеют. */
        resultAt: filled ? new Date() : null,
      },
      select: detailsSelect,
    });
  });

  return toDetails(row, viewer.role);
}

/** Удаление наряда. Позиции уходят каскадом — своей жизни у них нет. */
export async function remove(id: string): Promise<void> {
  const removed = await db.order.deleteMany({ where: { id } });
  if (removed.count === 0) throw new ApiException('not_found', 'Наряд не найден');
}
