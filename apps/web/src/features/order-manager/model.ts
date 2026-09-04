/** Раздел заказов: типы представления. Доменные схемы — в `entities/order`. */
import { z } from 'zod';

import type {
  OrderCard,
  OrderChecklistCard,
  OrderDocCard,
  OrderDocKind,
  OrderEquip,
  OrderInstallerRef,
  OrderPeriod,
  OrderPhotoCard,
  OrderStatus,
  OrderTab,
  OrderType,
  PaymentMode,
  PhotoStage,
  UnitSource,
} from '@/entities/order/model';
import { ORDER_EQUIPS, PAYMENT_MODES, UNIT_SOURCES } from '@/entities/order/model';
import type { DayBlockLike } from '@/entities/crm/lib/busy';
import {
  orderConsumeSchema,
  quantitySchema,
  stockMoveKindSchema,
  stockUnitSchema,
  stockZoneKindSchema,
} from '@/entities/stock/model';
import type {
  OrderConsume,
  StockDirectory,
  StockItemCard,
  StockMovementCard,
  StockUnit,
  StockZoneCard,
} from '@/entities/stock/model';
import { PANEL_TABS, resolvePanelTab, type PanelTab } from '@/shared/config/admin-tabs';
import { dayKeyOf, timeOf, todayKey, type DayKey } from '@/shared/lib/calendar';
import { deductionReducesFee, type Employment } from '@/shared/lib/employment';
import type { Page } from '@/shared/lib/paging';

export type {
  OrderCard,
  OrderChecklistCard,
  OrderClientRef,
  OrderDetails,
  OrderDocCard,
  OrderDocKind,
  OrderEquip,
  OrderHistoryEntry,
  OrderInstallerRef,
  OrderPeriod,
  OrderPhotoCard,
  OrderStatus,
  OrderTab,
  OrderType,
  OrderUnitCard,
  OrderUnitInput,
  PaymentMode,
  PhotoStage,
  UnitSource,
} from '@/entities/order/model';

export {
  INSTALLER_STATUSES,
  ORDER_DOC_KINDS,
  ORDER_EQUIPS,
  ORDER_PERIODS,
  ORDER_STATUSES,
  ORDER_TABS,
  ORDER_TYPES,
  PAYMENT_MODES,
  PHOTO_STAGES,
  UNIT_SOURCES,
  checklistItemCreateSchema,
  installerMaySetStatus,
  isOrderDocKind,
  isOrderPeriod,
  isOrderStatus,
  isOrderTab,
  isOrderType,
  orderCreateSchema,
} from '@/entities/order/model';

export { ADMIN_PAGE_SIZE, pageNumber } from '@/shared/lib/paging';

/** Страница списка нарядов — та же разбивка, что у клиентов и заявок. */
export type OrderPage = Page<OrderCard>;

/**
 * Ответ действия: успех либо готовый к показу текст ошибки. `id` приходит
 * от заведения наряда — по нему страница уходит в только что созданную карточку.
 */
export type OrderResult =
  | { readonly ok: true; readonly id?: string | undefined }
  | { readonly ok: false; readonly message: string; readonly field?: string | undefined };

/** Состояние отправки формы. Четыре, как везде на проекте. */
export type OrderFormStatus = 'idle' | 'sending' | 'success' | 'error';

/**
 * Позиция оборудования в форме. Числа — строками: это то, что человек ввёл,
 * а превращение «пусто» в `null` и текста в число живёт в одном месте ниже.
 *
 * `key` не уезжает на сервер: это опора React в списке, который правят по
 * месту. Без него удаление средней позиции переносило бы введённый текст на
 * соседнюю строку.
 */
export type OrderUnitDraft = {
  readonly key: string;
  readonly equip: OrderEquip;
  readonly model: string;
  readonly source: UnitSource;
  readonly trassaM: string;
  readonly diameter: string;
  readonly shtrob: boolean;
};

let unitKeySeq = 0;

/** Ключ новой позиции. Счётчик, а не случайное число: тесты должны повторяться. */
export function nextUnitKey(): string {
  unitKeySeq += 1;
  return `unit-${unitKeySeq}`;
}

export function emptyUnitDraft(): OrderUnitDraft {
  return {
    key: nextUnitKey(),
    equip: 'conditioner',
    model: '',
    source: 'ours',
    trassaM: '',
    diameter: '',
    shtrob: false,
  };
}

/** Поля наряда в форме — строки и флаги, как их вводит человек. */
export type OrderDraft = {
  /**
   * 🔴 Версия карточки, с которой её открыли, — не для показа, а для сохранения.
   * Уходит обратно на сервер, и тот отказывает, если за это время карточку
   * изменил кто-то другой (BUGS §1864). Пустая строка — у нового наряда,
   * версии у него ещё нет.
   */
  readonly updatedAt: string;
  readonly type: OrderType;
  /**
   * Статус правится только у заведённого наряда: у нового его назначает
   * сервер, а не форма (docs/API.md §13).
   */
  readonly status: OrderStatus;
  readonly clientId: string;
  readonly installerId: string;
  readonly day: string;
  readonly time: string;
  readonly durationMin: string;
  readonly address: string;
  readonly intercom: string;
  readonly phone2: string;
  readonly floor: string;
  readonly heightWorks: boolean;
  readonly payment: PaymentMode;
  readonly price: string;
  readonly installerFee: string;
  readonly deductionSum: string;
  readonly deductionReason: string;
  readonly comment: string;
  readonly ownerNote: string;
  /** Обращение, из которого завели наряд. Поля в форме нет — оно переносится. */
  readonly leadId: string | null;
  readonly units: readonly OrderUnitDraft[];
};

/**
 * Пустой наряд. День по умолчанию — сегодняшний по Москве: наряд заводят,
 * пока клиент на линии, и чаще всего на ближайшие дни.
 */
export function emptyOrderDraft(day: DayKey = todayKey()): OrderDraft {
  return {
    type: 'install',
    status: 'new',
    clientId: '',
    installerId: '',
    day,
    time: '10:00',
    durationMin: '120',
    address: '',
    intercom: '',
    phone2: '',
    floor: '',
    heightWorks: false,
    payment: 'company',
    price: '0',
    installerFee: '0',
    deductionSum: '0',
    deductionReason: '',
    comment: '',
    ownerNote: '',
    updatedAt: '',
    leadId: null,
    units: [],
  };
}

function text(value: string | null | undefined): string {
  return value ?? '';
}

function money(value: number | undefined): string {
  return String(value ?? 0);
}

/**
 * Наряд с сервера → поля формы.
 *
 * День и время достаются из момента в поясе работ: наряд, назначенный на
 * девять утра в Туле, обязан остаться девятью утра, из какого бы пояса
 * владелец ни открыл панель.
 */
export function orderDraftOf(order: OrderCard, timeZone?: string): OrderDraft {
  const at = new Date(order.at);

  return {
    type: order.type,
    status: order.status,
    clientId: order.client.id,
    installerId: order.installer?.id ?? '',
    day: dayKeyOf(at, timeZone),
    time: timeOf(at, timeZone),
    durationMin: String(order.durationMin),
    address: order.address,
    intercom: text(order.intercom),
    phone2: text(order.phone2),
    floor: order.floor === null ? '' : String(order.floor),
    heightWorks: order.heightWorks,
    payment: order.payment,
    price: money(order.price),
    installerFee: money(order.installerFee),
    deductionSum: money(order.deductionSum),
    deductionReason: text(order.deductionReason),
    comment: text(order.comment),
    ownerNote: text(order.ownerNote),
    updatedAt: order.updatedAt,
    leadId: order.leadId,
    units: order.units.map((unit) => ({
      key: unit.id,
      equip: unit.equip,
      model: text(unit.model),
      source: unit.source,
      trassaM: unit.trassaM === null ? '' : String(unit.trassaM),
      diameter: text(unit.diameter),
      shtrob: unit.shtrob,
    })),
  };
}

/** Число из поля ввода. Пусто — это ноль рублей, а не «не заполнено». */
function intOrZero(value: string): number {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Число, которого может не быть: этаж и длина трассы известны не всегда. */
function intOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  return Number.parseInt(value.trim(), 10);
}

/**
 * Поля формы → тело запроса.
 *
 * 🔴 Одно место на весь раздел: этой же функцией форма проверяет черновик
 * доменной схемой перед отправкой. Иначе клиентская проверка смотрела бы на
 * одни данные, а сервер получал другие.
 */
export function orderPayload(draft: OrderDraft): Record<string, unknown> {
  return {
    type: draft.type,
    clientId: draft.clientId,
    installerId: draft.installerId,
    day: draft.day,
    time: draft.time,
    /* Длительность нарочно без подстановки нуля: пустое поле — это ошибка
       ввода, и схема обязана сказать о ней, а не молча поставить «0 минут». */
    durationMin: Number.parseInt(draft.durationMin.trim(), 10),
    address: draft.address,
    intercom: draft.intercom,
    phone2: draft.phone2,
    floor: intOrNull(draft.floor),
    heightWorks: draft.heightWorks,
    payment: draft.payment,
    price: intOrZero(draft.price),
    installerFee: intOrZero(draft.installerFee),
    deductionSum: intOrZero(draft.deductionSum),
    deductionReason: draft.deductionReason,
    comment: draft.comment,
    ownerNote: draft.ownerNote,
    leadId: draft.leadId ?? '',
    units: draft.units.map((unit) => ({
      equip: unit.equip,
      model: unit.model,
      source: unit.source,
      trassaM: intOrNull(unit.trassaM),
      diameter: unit.diameter,
      shtrob: unit.shtrob,
    })),
  };
}

const DRAFT_FIELDS = [
  'type',
  'status',
  'clientId',
  'installerId',
  'day',
  'time',
  'durationMin',
  'address',
  'intercom',
  'phone2',
  'floor',
  'heightWorks',
  'payment',
  'price',
  'installerFee',
  'deductionSum',
  'deductionReason',
  'comment',
  'ownerNote',
] as const;

export type OrderField = (typeof DRAFT_FIELDS)[number];

/**
 * Путь ошибки Zod и `field` из ответа сервера — произвольные строки. Полем
 * формы их делает эта проверка: подсветить нужно то поле, которое есть.
 */
export function isOrderField(value: unknown): value is OrderField {
  return typeof value === 'string' && DRAFT_FIELDS.some((field) => field === value);
}

/**
 * Что означает удержание для этого монтажника.
 *
 * 🔴 Оформление не заведено — ведём себя как при трудовом договоре: молчание
 * не разрешение (CRM.md §9).
 */
export type DeductionMode = 'reduces' | 'internal' | 'unknown' | 'unassigned';

export function deductionModeOf(installer: OrderInstallerRef | null | undefined): DeductionMode {
  if (installer === null || installer === undefined) return 'unassigned';
  if (installer.employment === null) return 'unknown';
  return deductionReducesFee(installer.employment) ? 'reduces' : 'internal';
}

/**
 * Значение из `select` — строка. Приведение типа на проекте запрещено, а
 * молча принять чужую строку значит отправить на сервер мусор. Домен даёт
 * такие проверки статусу и типу работ; позиции и оплате их не хватало.
 */
export function isOrderEquip(value: string): value is OrderEquip {
  return ORDER_EQUIPS.some((equip) => equip === value);
}

export function isUnitSource(value: string): value is UnitSource {
  return UNIT_SOURCES.some((source) => source === value);
}

export function isPaymentMode(value: string): value is PaymentMode {
  return PAYMENT_MODES.some((mode) => mode === value);
}

/** Как зовут монтажника. Имя может быть не заполнено — тогда логин. */
export function installerName(installer: OrderInstallerRef): string {
  return installer.name ?? installer.login;
}

export type { Employment, Page };

// ---------- Адрес списка ----------

export const ORDERS_PATH = '/admin/orders';

/** Состояние фильтра. Живёт в адресе, а не в состоянии компонента. */
export type OrderFilterState = {
  readonly tab: OrderTab;
  readonly period: OrderPeriod;
  readonly query: string;
};

export const DEFAULT_ORDER_FILTERS: OrderFilterState = {
  tab: 'active',
  period: 'all',
  query: '',
};

/**
 * Стопка в адресе ↔ стопка в домене.
 *
 * 🔴 Единственная пара, где они расходятся, — отказы: макет называет вкладку
 * `declined`, а домен — статусом `cancelled`. Словарь вкладок описывает
 * адрес, домен описывает работу, и переводит их раздел на своей границе
 * (ADR-255). Контракт `/api/admin/orders` от этого не двигается: наружу
 * по-прежнему уходит доменное значение.
 */
const TAB_BY_PARAM: Record<PanelTab<'orders'>, OrderTab> = {
  active: 'active',
  new: 'new',
  history: 'history',
  declined: 'cancelled',
  all: 'all',
};

const PARAM_BY_TAB: Record<OrderTab, PanelTab<'orders'>> = {
  active: 'active',
  new: 'new',
  history: 'history',
  cancelled: 'declined',
  all: 'all',
};

/** Ключ вкладки для адреса. */
export function orderTabParam(tab: OrderTab): PanelTab<'orders'> {
  return PARAM_BY_TAB[tab];
}

/**
 * Стопка из адреса. Разбирается схемой словаря: мусор, чужой ключ и
 * отсутствие параметра открывают первую вкладку, а не роняют раздел
 * (issue #341).
 */
export function orderTabFromParam(value: unknown): OrderTab {
  return TAB_BY_PARAM[resolvePanelTab(PANEL_TABS.orders, value)];
}

/**
 * Параметры адреса. Умолчания опускаются: ссылка, которую владелец кому-то
 * пришлёт, не должна тащить `?tab=active&period=all` без единого смысла.
 */
export function ordersQuery(filters: Partial<OrderFilterState>): Record<string, string> {
  const tab = filters.tab ?? DEFAULT_ORDER_FILTERS.tab;
  const period = filters.period ?? DEFAULT_ORDER_FILTERS.period;
  const query = (filters.query ?? '').trim();

  return {
    ...(tab === DEFAULT_ORDER_FILTERS.tab ? {} : { tab: orderTabParam(tab) }),
    ...(period === DEFAULT_ORDER_FILTERS.period ? {} : { period }),
    ...(query === '' ? {} : { q: query }),
  };
}

export function ordersHref(filters: Partial<OrderFilterState>): {
  readonly pathname: string;
  readonly query: Record<string, string>;
} {
  return { pathname: ORDERS_PATH, query: ordersQuery(filters) };
}

/** Фильтр отличается от умолчания: пустой список тогда объясняется иначе. */
export function filtersApplied(filters: Partial<OrderFilterState>): boolean {
  return Object.keys(ordersQuery(filters)).length > 0;
}

// ---------- Адрес карточки ----------

/**
 * Вкладки карточки наряда — все пять ключей словаря (issue #346).
 *
 * «Расход» и «История» стояли блоками под лентой вкладок, и карточка
 * заканчивалась двумя разделами, до которых нужно было доскроллить. Теперь
 * порядок совпадает с ходом работы: наряд → что израсходовали → что взять →
 * бумаги → кто и когда менял.
 */
export const ORDER_CARD_TABS = PANEL_TABS.orderCard;

export type OrderCardTab = PanelTab<'orderCard'>;

/**
 * 🔴 Вкладок у монтажника четыре: истории он не видит вовсе (ADR-114).
 *
 * В истории лежат переназначения — разговор владельца с людьми, а не работа
 * монтажника, и сервер не кладёт этот ключ в его ответ. Раз панели нет,
 * не должно быть и вкладки: пустая вкладка «История» сообщала бы, что
 * история есть, но пуста, — а это неправда.
 */
export const INSTALLER_CARD_TABS = [
  'job',
  'materials',
  'checklist',
  'documents',
] as const satisfies readonly PanelTab<'orderCard'>[];

/** Набор вкладок под роль: у монтажника он короче на историю. */
export function orderCardTabsFor(
  forInstaller: boolean,
): readonly [OrderCardTab, ...OrderCardTab[]] {
  return forInstaller ? INSTALLER_CARD_TABS : ORDER_CARD_TABS;
}

/**
 * Вкладка карточки из адреса. Мусор, чужой ключ и вкладка, которой у этой
 * роли нет, открывают первую (issue #341): `?tab=history` у монтажника — это
 * ссылка, присланная владельцем, а не повод показать пустоту.
 */
export function orderCardTabFromParam(
  value: unknown,
  tabs: readonly [OrderCardTab, ...OrderCardTab[]] = ORDER_CARD_TABS,
): OrderCardTab {
  return resolvePanelTab(tabs, value);
}

/**
 * Действия раздела вынесены интерфейсом: истории и тесты подставляют свои,
 * не поднимая сеть.
 */
export type OrderApi = {
  readonly create: (draft: OrderDraft) => Promise<OrderResult>;
  readonly update: (id: string, draft: OrderDraft) => Promise<OrderResult>;
  readonly remove: (id: string) => Promise<OrderResult>;
  /** Отдельным действием: монтажнику доступен только статус, и только он. */
  readonly setStatus: (id: string, status: OrderStatus) => Promise<OrderResult>;
};

// ---------- Наряд в работе ----------

/**
 * Занятость монтажника в том виде, в каком её читает форма наряда.
 *
 * `userId` рядом с записью обязателен: занятость личная, и складывать окна
 * разных людей нельзя — «Дмитрий с 10 до 12» и «Сергей с 11 до 14» это два
 * занятых человека, а не один занятый с 10 до 14 (ADR-115).
 */
export type OrderBlock = DayBlockLike & { readonly userId: string };

/**
 * Чужой выезд как источник занятости.
 *
 * 🔴 Человек занят не только врачом, но и работой (ADR-123). День здесь
 * отдельным полем, а не выводится из момента: пояс работ считает сервер, и
 * пересчитывать его в браузере значит однажды разойтись на три часа.
 */
export type OrderWorkSpan = {
  readonly userId: string;
  readonly day: string;
  readonly fromMin: number;
  readonly toMin: number;
  readonly reason: string | null;
};

/** Итог работ полями формы: строки, как их вводит человек. */
export type OrderResultDraft = {
  readonly extraWork: string;
  readonly report: string;
};

export function resultDraftOf(order: {
  readonly extraWork: string | null;
  readonly report: string | null;
}): OrderResultDraft {
  return { extraWork: order.extraWork ?? '', report: order.report ?? '' };
}

/** Заполнен ли итог: по этому же признаку сервер ставит и снимает время. */
export function resultFilled(draft: OrderResultDraft): boolean {
  return draft.extraWork.trim() !== '' || draft.report.trim() !== '';
}

/**
 * Действия наряда в работе. Вынесены интерфейсом: истории и тесты подставляют
 * свои, не поднимая сеть.
 */
export type OrderWorkApi = {
  readonly saveResult: (draft: OrderResultDraft) => Promise<OrderResult>;
  readonly addItem: (text: string) => Promise<OrderResult>;
  readonly setItemDone: (itemId: string, done: boolean) => Promise<OrderResult>;
  readonly removeItem: (itemId: string) => Promise<OrderResult>;
  readonly rebuildChecklist: () => Promise<OrderResult>;
  readonly addDoc: (kind: OrderDocKind, file: File) => Promise<OrderResult>;
  readonly removeDoc: (docId: string) => Promise<OrderResult>;
  readonly addPhoto: (stage: PhotoStage, file: File) => Promise<OrderResult>;
  readonly removePhoto: (photoId: string) => Promise<OrderResult>;
};

/** Фотографии, разложенные по этапам: «до» и «после» — разные колонки. */
export function photosOfStage(
  photos: readonly OrderPhotoCard[],
  stage: PhotoStage,
): readonly OrderPhotoCard[] {
  return photos.filter((photo) => photo.stage === stage);
}

/** Документы одного вида идут вместе: договоров бывает несколько. */
export function docsOfKind(
  docs: readonly OrderDocCard[],
  kind: OrderDocKind,
): readonly OrderDocCard[] {
  return docs.filter((doc) => doc.kind === kind);
}

/** Сколько пунктов чеклиста собрано: подпись «7 из 12» считается один раз. */
export function checklistProgress(items: readonly OrderChecklistCard[]): {
  readonly done: number;
  readonly total: number;
} {
  return { done: items.filter((item) => item.done).length, total: items.length };
}

// ---------- Расход материалов ----------

/**
 * Расход наряда — docs/CRM.md §11.6, контракт маршрутов — docs/API.md §14.
 *
 * 🔴 Ответы склада приходят снаружи и разбираются схемой, а не приведением
 * типа. Владельческие ключи позиции (`minQty`, `low`) в схеме отсутствуют
 * намеренно: монтажнику их не кладут в ответ вовсе (ADR-134), и разбор,
 * который их ждёт, однажды покажет то, чего показывать нельзя. Zod лишние
 * ключи молча отбрасывает — интерфейс не знает о пороге заказа ничего.
 */

const zoneRefSchema = z.object({ id: z.string(), name: z.string() }).nullable();

export const stockMovementCardSchema = z.object({
  id: z.string(),
  kind: stockMoveKindSchema,
  qty: z.number(),
  item: z.object({ id: z.string(), name: z.string(), unit: stockUnitSchema }),
  fromZone: zoneRefSchema,
  toZone: zoneRefSchema,
  order: z.object({ id: z.string(), number: z.number() }).nullable(),
  serials: z.string().nullable(),
  reason: z.string().nullable(),
  authorName: z.string().nullable(),
  createdAt: z.string(),
});

export const orderConsumptionSchema = z.object({ items: z.array(stockMovementCardSchema) });

export const stockZoneCardSchema = z.object({
  id: z.string(),
  kind: stockZoneKindSchema,
  name: z.string(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  sort: z.number(),
  archived: z.boolean(),
});

export const stockItemCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  group: z.string().nullable(),
  unit: stockUnitSchema,
  note: z.string().nullable(),
  archived: z.boolean(),
  product: z.object({ id: z.string(), name: z.string(), slug: z.string() }).nullable(),
  /* Остаток по зонам приходит по всем видимым зонам, включая нулевые. */
  byZone: z.record(z.number()),
  total: z.number(),
});

/**
 * Страница справочника. `pages` объявлено с умолчанием: раздел расхода не
 * должен отказываться работать из-за необязательной для него подробности.
 */
export const stockOverviewSchema = z.object({
  zones: z.array(stockZoneCardSchema),
  items: z.array(stockItemCardSchema),
  pages: z.number().int().min(1).default(1),
});

/** Справочник в том виде, в каком его читает форма списания. */
/* Тип переехал в домен: тем же справочником теперь отвечает сервер, а два
   описания одной формы данных разъехались бы на первой правке (issue #88). */
export type { StockDirectory };

/** Что показывает блок расхода: движения наряда и справочник для формы. */
export type ConsumptionLoad =
  | {
      readonly ok: true;
      readonly moves: readonly StockMovementCard[];
      readonly stock: StockDirectory;
    }
  | { readonly ok: false; readonly message: string };

/**
 * Строка списания в том виде, в каком её принимает сервер.
 *
 * 🔴 Своей схемы у формы нет: правила ввода живут в `entities/stock`, и вторая
 * их копия разошлась бы с первой на первой же правке. Оттуда же берётся разбор
 * количества — «1,5» и «12 000» это то, как пишут по-русски, и второй разбор
 * в браузере однажды отличился бы от серверного на пробеле.
 */
export type ConsumptionLine = OrderConsume['lines'][number];

/** Поля формы списания — строки, как их вводит человек. */
export type ConsumptionDraft = {
  readonly itemId: string;
  readonly fromZoneId: string;
  readonly qty: string;
  readonly serials: string;
};

export function emptyConsumptionDraft(fromZoneId = ''): ConsumptionDraft {
  return { itemId: '', fromZoneId, qty: '', serials: '' };
}

const CONSUMPTION_FIELDS = ['itemId', 'fromZoneId', 'qty', 'serials'] as const;

export type ConsumptionField = (typeof CONSUMPTION_FIELDS)[number];

function isConsumptionField(value: unknown): value is ConsumptionField {
  return typeof value === 'string' && CONSUMPTION_FIELDS.some((field) => field === value);
}

/**
 * Поле формы по имени, которое назвал Zod или сервер.
 *
 * Строка списания едет в массиве, поэтому путь ошибки выглядит как
 * `lines.0.qty` — на сервере он собирается через точку (`server/http.ts`).
 * Подсветить нужно то же поле, что и при местной проверке, поэтому берётся
 * последнее звено пути, а не строка целиком.
 */
export function consumptionFieldOf(value: unknown): ConsumptionField | null {
  if (typeof value !== 'string') return null;

  const last = value.split('.').at(-1);
  return isConsumptionField(last) ? last : null;
}

/**
 * Черновик формы → строка списания, проверенная доменной схемой склада.
 *
 * Проверка идёт тем же объектом, что уедет на сервер: клиентская проверка,
 * смотрящая на другие данные, — это не проверка, а совпадение.
 */
export function parseConsumptionDraft(
  draft: ConsumptionDraft,
):
  | { readonly ok: true; readonly line: ConsumptionLine }
  | { readonly ok: false; readonly field: ConsumptionField | null; readonly message: string } {
  const parsed = orderConsumeSchema.safeParse({ lines: [draft] });

  if (parsed.success) {
    const line = parsed.data.lines[0];
    if (line !== undefined) return { ok: true, line };
  }

  const issue = parsed.success ? undefined : parsed.error.issues[0];

  return {
    ok: false,
    field: consumptionFieldOf(issue?.path.join('.')),
    message: issue?.message ?? '',
  };
}

/**
 * Действия расхода вынесены интерфейсом: истории и тесты подставляют свои,
 * не поднимая сеть.
 */
export type OrderConsumptionApi = {
  readonly load: () => Promise<ConsumptionLoad>;
  readonly consume: (line: ConsumptionLine) => Promise<OrderResult>;
  /** 🔴 Отмена — возвратом, а не удалением: журнал движений не переписывается. */
  readonly cancel: (moveId: string) => Promise<OrderResult>;
};

/* Три знака после запятой — предел, который хранит склад. Округление здесь
   существует, чтобы 4 − 4 не давало 0.0000000001 в подписи «итого». */
const QTY_STEP = 1000;

function rounded(value: number): number {
  return Math.round(value * QTY_STEP) / QTY_STEP;
}

/**
 * Остаток позиции в выбранной зоне.
 *
 * 🔴 Ключа зоны может не быть — и это ноль, а не сбой: монтажнику приходят
 * только его зоны, и спрашивать остаток чужой машины интерфейс не должен
 * уметь в принципе.
 */
export function zoneBalance(item: StockItemCard | undefined, zoneId: string): number {
  if (item === undefined || zoneId === '') return 0;
  return item.byZone[zoneId] ?? 0;
}

/**
 * Сколько не хватает на складе. Ноль — хватает.
 *
 * 🔴 Уход в минус не запрещается, а помечается (ADR-134): монтажник, у
 * которого труба кончилась раньше, чем в системе, при запрете впишет
 * неправду, лишь бы закрыть наряд.
 */
export function consumptionShortfall(
  item: StockItemCard | undefined,
  zoneId: string,
  qty: number | null,
): number {
  if (item === undefined || zoneId === '' || qty === null) return 0;

  const short = qty - zoneBalance(item, zoneId);
  return short > 0 ? rounded(short) : 0;
}

/** Количество из поля ввода той же схемой, что уедет на сервер. `null` — мусор. */
export function consumptionQty(value: string): number | null {
  const parsed = quantitySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Техника ссылается на модель каталога, расходники — нет: серийники нужны ей. */
export function isEquipmentItem(item: StockItemCard | undefined): boolean {
  return item !== undefined && item.product !== null;
}

export function findStockItem(
  items: readonly StockItemCard[],
  itemId: string,
): StockItemCard | undefined {
  return items.find((item) => item.id === itemId);
}

export type ConsumptionTotal = {
  readonly itemId: string;
  readonly name: string;
  readonly unit: StockUnit;
  readonly qty: number;
};

/**
 * Сколько ушло на наряд по факту: списания минус возвраты.
 *
 * 🔴 Возврат не стирает списание, а гасит его встречной записью — поэтому
 * «сколько израсходовано» считается, а не берётся из последней строки. Ноль
 * не показывается: списали и вернули — по факту не израсходовано ничего.
 */
export function consumptionTotals(
  moves: readonly StockMovementCard[],
): readonly ConsumptionTotal[] {
  const byItem = new Map<string, ConsumptionTotal>();

  for (const move of moves) {
    if (move.kind !== 'consume' && move.kind !== 'return') continue;

    const previous = byItem.get(move.item.id);
    const delta = move.kind === 'consume' ? move.qty : -move.qty;

    byItem.set(move.item.id, {
      itemId: move.item.id,
      name: move.item.name,
      unit: move.item.unit,
      qty: rounded((previous?.qty ?? 0) + delta),
    });
  }

  return [...byItem.values()].filter((total) => total.qty !== 0);
}

/**
 * Позиции наряда, чей остаток в зоне ушёл в минус.
 *
 * 🔴 Предупреждение живёт не только в момент ввода: списали больше, чем
 * числилось, — и склад разошёлся с реальностью надолго. Форма скажет об этом
 * тому, кто списывает; блок обязан сказать и тому, кто откроет наряд завтра
 * (CRM.md §11.6).
 *
 * Считается по справочнику, а не по движениям: остаток — сумма всех движений
 * позиции, а не только тех, что относятся к этому наряду.
 */
export function negativeBalances(
  moves: readonly StockMovementCard[],
  items: readonly StockItemCard[],
): readonly ConsumptionTotal[] {
  const found = new Map<string, ConsumptionTotal>();

  for (const move of moves) {
    if (move.kind !== 'consume' || move.fromZone === null) continue;

    const item = findStockItem(items, move.item.id);
    if (item === undefined) continue;

    const rest = zoneBalance(item, move.fromZone.id);
    if (rest >= 0) continue;

    found.set(`${item.id}:${move.fromZone.id}`, {
      itemId: `${item.id}:${move.fromZone.id}`,
      name: `${item.name} · ${move.fromZone.name}`,
      unit: item.unit,
      qty: rounded(rest),
    });
  }

  return [...found.values()];
}

/** Подсказка из чеклиста: пункт сборов, которому нашлась позиция склада. */
export type ConsumptionHint = {
  readonly itemId: string;
  readonly itemName: string;
  /** Текст пункта: человек должен узнать свою строку, а не гадать. */
  readonly text: string;
};

/* Пунктуация и кавычки сравнению мешают: в накладной «1/4″», в чеклисте
   «1/4"». Сводим к словам и пробелам, а не к точному написанию. */
const PUNCTUATION = /[^\p{L}\p{N}/]+/gu;

function comparable(value: string): string {
  return value.toLocaleLowerCase('ru-RU').replace(PUNCTUATION, ' ').trim();
}

/* Название короче трёх букв совпадёт с чем угодно — такие в подсказки не идут. */
const MIN_NAME = 3;

/**
 * Связка чеклиста со складом (CRM.md §11.6): чеклист знает, что нужно, склад
 * отвечает, есть ли.
 *
 * 🔴 Это ускоритель, а не единственный путь: форма списания работает и без
 * единого совпадения. Совпадение ищется по вхождению названия позиции в текст
 * пункта — точного соответствия между свободным текстом сборов и
 * номенклатурой поставщика не бывает, и требовать его значит не показать
 * подсказку никогда.
 */
export function consumptionHints(
  checklist: readonly OrderChecklistCard[],
  items: readonly StockItemCard[],
): readonly ConsumptionHint[] {
  const hints: ConsumptionHint[] = [];

  for (const item of items) {
    if (item.archived) continue;

    const name = comparable(item.name);
    if (name.length < MIN_NAME) continue;

    const point = checklist.find((entry) => comparable(entry.text).includes(name));
    if (point === undefined) continue;

    hints.push({ itemId: item.id, itemName: item.name, text: point.text });
  }

  return hints;
}

/* Доменные типы склада переносятся наружу вместе с блоком расхода: страница и
   истории не должны знать, из какой сущности он их берёт. */
export type { StockItemCard, StockMovementCard, StockUnit, StockZoneCard };
