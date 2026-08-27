/** Раздел заказов: типы представления. Доменные схемы — в `entities/order`. */
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
 * Параметры адреса. Умолчания опускаются: ссылка, которую владелец кому-то
 * пришлёт, не должна тащить `?tab=active&period=all` без единого смысла.
 */
export function ordersQuery(filters: Partial<OrderFilterState>): Record<string, string> {
  const tab = filters.tab ?? DEFAULT_ORDER_FILTERS.tab;
  const period = filters.period ?? DEFAULT_ORDER_FILTERS.period;
  const query = (filters.query ?? '').trim();

  return {
    ...(tab === DEFAULT_ORDER_FILTERS.tab ? {} : { tab }),
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
