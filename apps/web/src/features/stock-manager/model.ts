/** Раздел склада: типы представления. Доменные схемы — в `entities/stock`. */
import type { Route } from 'next';

import {
  isStockMoveKind,
  stockItemCreateSchema,
  stockItemUpdateSchema,
  stockMovementCreateSchema,
  stockZoneCreateSchema,
  stockZoneUpdateSchema,
  type StockItemCard,
  type StockMoveKind,
  type StockMovementCard,
  type StockUnit,
  type StockZoneCard,
  type StockZoneKind,
} from '@/entities/stock/model';
import { PANEL_TABS, resolvePanelTab, type PanelTab } from '@/shared/config/admin-tabs';
import type { Page } from '@/shared/lib/paging';

export type {
  StockItemCard,
  StockItemProduct,
  StockMoveKind,
  StockMovementCard,
  StockOverview,
  StockUnit,
  StockZoneCard,
  StockZoneKind,
} from '@/entities/stock/model';

export {
  STOCK_MOVE_KINDS,
  STOCK_UNITS,
  STOCK_ZONE_KINDS,
  isStockMoveKind,
  isStockUnit,
} from '@/entities/stock/model';

export { ADMIN_PAGE_SIZE, pageNumber } from '@/shared/lib/paging';

/* ---------- Адреса раздела ---------- */

export const STOCK_PATH = '/admin/stock' satisfies Route;

/**
 * Зоны хранения — вкладка раздела, а не своя страница (issue #352). Прежний
 * адрес `/admin/stock/zones` остался и разворачивает сюда: закладку владельца
 * ломать нельзя.
 */
export const STOCK_ZONES_PATH = '/admin/stock?tab=zones' satisfies Route;

/**
 * Адрес карточки позиции.
 *
 * Тип литеральный, а не `string`, как и у адреса движения: маршруты проекта
 * типизированы, и обычная строка не годится для мягкого перехода.
 */
export function stockItemPath(id: string): `/admin/stock/items/${string}` {
  return `/admin/stock/items/${id}`;
}

/**
 * Адреса окон создания (ADR-137). Окно живёт по собственному адресу, а не в
 * состоянии компонента: иначе ссылку на форму нельзя прислать, «назад» уводит
 * из раздела, а обновление страницы теряет ввод (ADR-117).
 */
export const STOCK_ITEM_NEW_PATH = '/admin/stock/items/new' satisfies Route;
export const STOCK_ZONE_NEW_PATH = '/admin/stock/zones/new' satisfies Route;
export const STOCK_MOVE_PATH = '/admin/stock/move' satisfies Route;

/**
 * Журнал движений всего склада — вторая вкладка раздела.
 *
 * 🔴 Свой вид, а не замена истории позиции (ADR-137): «что было на складе в
 * четверг» и «куда делась эта труба» — разные вопросы, и второй перебором
 * позиций не решается. Прежний адрес `/admin/stock/journal` разворачивает сюда.
 */
export const STOCK_JOURNAL_PATH = '/admin/stock?tab=log' satisfies Route;

/* ---------- Вкладки раздела ---------- */

/**
 * Три вкладки одного адреса: остатки, журнал движений, зоны хранения
 * (issue #352). До этого раздел жил тремя страницами, и «назад» из журнала
 * уводило не на ту, с которой в него зашли.
 *
 * 🔴 За каждой вкладкой стоит своя выборка — остатки со страницами, журнал
 * со своими страницами и фильтром вида, справочник зон вместе с архивными.
 * Поэтому вкладки здесь ссылки, а не кнопки: собирает их сервер (ADR-256).
 */
export const STOCK_TABS = PANEL_TABS.stock;
export type StockTab = PanelTab<'stock'>;

/** Раздел открывается остатками: за ними в него и заходят. */
export const DEFAULT_STOCK_TAB: StockTab = STOCK_TABS[0];

/** Вкладка из адреса. Мусор и пустота открывают остатки (issue #341). */
export function stockTabFromParam(value: unknown): StockTab {
  return resolvePanelTab(STOCK_TABS, value);
}

/**
 * Параметры адреса вкладки. Умолчание опускается: ссылка на остатки — это
 * `/admin/stock`, без хвоста, который ничего не выбирает.
 *
 * Фильтры остатков переезжают вместе со вкладкой только на своей: журналу и
 * зонам поиск по позициям не адресован, и тащить его туда значит показывать
 * снятый фильтр, которого на экране нет.
 */
export function stockTabQuery(
  tab: StockTab,
  filters?: Partial<StockFilterState>,
): Record<string, string> {
  const own = tab === DEFAULT_STOCK_TAB && filters !== undefined ? stockQuery(filters) : {};

  return { ...own, ...(tab === DEFAULT_STOCK_TAB ? {} : { tab }) };
}

export function stockTabHref(
  tab: StockTab,
  filters?: Partial<StockFilterState>,
): { readonly pathname: string; readonly query: Record<string, string> } {
  return { pathname: STOCK_PATH, query: stockTabQuery(tab, filters) };
}

/* ---------- Фильтры остатков ---------- */

/**
 * Состояние фильтра. 🔴 Живёт в адресе, а не в состоянии компонента: иначе
 * «Дальше» уводит на вторую страницу нефильтрованного справочника, и владелец
 * теряет запрос ровно там, где он был нужен.
 */
export type StockFilterState = {
  readonly query: string;
  readonly group: string;
  /** Только позиции, опустившиеся ниже своего порога заказа. */
  readonly low: boolean;
  /**
   * Архив вместо обычного списка. Не примесь к нему: позиция, которой больше
   * не пользуются, не должна стоять там же, где выбирают, что взять на выезд,
   * — но и пропадать насовсем она не имеет права, иначе вернуть её нечем.
   */
  readonly archived: boolean;
};

export const DEFAULT_STOCK_FILTERS: StockFilterState = {
  query: '',
  group: '',
  low: false,
  archived: false,
};

/**
 * Параметры адреса. Умолчания опускаются: ссылка, которую владелец пришлёт
 * себе в мессенджер, не должна тащить `?low=0` без единого смысла.
 */
export function stockQuery(filters: Partial<StockFilterState>): Record<string, string> {
  const query = (filters.query ?? DEFAULT_STOCK_FILTERS.query).trim();
  const group = (filters.group ?? DEFAULT_STOCK_FILTERS.group).trim();
  const low = filters.low ?? DEFAULT_STOCK_FILTERS.low;
  const archived = filters.archived ?? DEFAULT_STOCK_FILTERS.archived;

  return {
    ...(query === '' ? {} : { q: query }),
    ...(group === '' ? {} : { group }),
    ...(low ? { low: '1' } : {}),
    ...(archived ? { archived: '1' } : {}),
  };
}

export function stockHref(filters: Partial<StockFilterState>): {
  readonly pathname: string;
  readonly query: Record<string, string>;
} {
  return { pathname: STOCK_PATH, query: stockQuery(filters) };
}

/** Фильтр отличается от умолчания: пустая таблица тогда объясняется иначе. */
export function stockFiltersApplied(filters: Partial<StockFilterState>): boolean {
  return Object.keys(stockQuery(filters)).length > 0;
}

/** Значение признака из адреса. Всё, кроме единицы, — «показываем всё». */
export function lowFromParam(raw: string | undefined): boolean {
  return raw === '1';
}

/* ---------- Ответ действия ---------- */

/** Успех либо готовый к показу текст ошибки. */
export type StockResult =
  { readonly ok: true } | { readonly ok: false; readonly message: string; readonly field?: string };

/** Состояние отправки формы. Четыре, как везде на проекте. */
export type StockStatus = 'idle' | 'sending' | 'success' | 'error';

/* ---------- Позиция справочника ---------- */

/** Поля формы позиции — строки, как их вводит человек. */
export type StockItemDraft = {
  readonly name: string;
  readonly group: string;
  readonly unit: StockUnit;
  readonly minQty: string;
  readonly productId: string;
  readonly note: string;
  readonly archived: boolean;
};

export const emptyItemDraft: StockItemDraft = {
  name: '',
  group: '',
  unit: 'piece',
  minQty: '',
  productId: '',
  note: '',
  archived: false,
};

/**
 * Число в поле ввода — по-русски, через запятую: так его набирают с телефона,
 * и так же его принимает доменная схема. Точка из `String(0.5)` в поле выглядит
 * чужой строкой, которую владелец тут же переправит.
 */
export function qtyInput(value: number): string {
  return String(value).replace('.', ',');
}

/** Запись справочника → поля формы. */
export function itemDraftOf(item: StockItemCard): StockItemDraft {
  return {
    name: item.name,
    group: item.group ?? '',
    unit: item.unit,
    /* Порога может не быть в ответе вовсе — это владельческий ключ. */
    minQty: item.minQty === undefined || item.minQty === 0 ? '' : qtyInput(item.minQty),
    productId: item.product === null ? '' : item.product.id,
    note: item.note ?? '',
    archived: item.archived,
  };
}

/* ---------- Зона хранения ---------- */

/** Человек, за которым можно закрепить машину. */
export type StockZonePerson = {
  readonly id: string;
  readonly name: string;
};

/** Поля формы зоны — строки, как их вводит человек. */
export type StockZoneDraft = {
  readonly kind: StockZoneKind;
  readonly name: string;
  /** Пусто — хозяина нет. У машины это ошибка, у склада — единственный вариант. */
  readonly userId: string;
  readonly sort: string;
  readonly archived: boolean;
};

export const emptyZoneDraft: StockZoneDraft = {
  kind: 'warehouse',
  name: '',
  userId: '',
  sort: '0',
  archived: false,
};

export function zoneDraftOf(zone: StockZoneCard): StockZoneDraft {
  return {
    kind: zone.kind,
    name: zone.name,
    userId: zone.userId ?? '',
    sort: String(zone.sort),
    archived: zone.archived,
  };
}

/* ---------- Движение ---------- */

/**
 * Виды движения, которые заводятся из раздела склада.
 *
 * Списания в наряд и возврата здесь нет намеренно: они делаются из карточки
 * наряда, где известно, на какую работу ушёл материал (docs/API.md §14).
 * Движение без наряда сервер и не примет.
 */
export const STOCK_SECTION_MOVES: readonly StockMoveKind[] = ['income', 'transfer', 'count'];

/** Позиция в форме движения: столько, сколько нужно, чтобы её выбрать. */
export type StockItemRef = {
  readonly id: string;
  readonly name: string;
  readonly unit: StockUnit;
};

export function itemRefOf(item: StockItemCard): StockItemRef {
  return { id: item.id, name: item.name, unit: item.unit };
}

/** Поля формы движения — строки, как их вводит человек. */
export type StockMoveDraft = {
  readonly kind: StockMoveKind;
  readonly itemId: string;
  readonly qty: string;
  readonly fromZoneId: string;
  readonly toZoneId: string;
  readonly serials: string;
  readonly reason: string;
};

export function emptyMoveDraft(itemId = ''): StockMoveDraft {
  return {
    kind: 'income',
    itemId,
    qty: '',
    fromZoneId: '',
    toZoneId: '',
    serials: '',
    reason: '',
  };
}

/**
 * Что подставлено в форму движения адресом окна.
 *
 * 🔴 Именно адрес, а не состояние: отпущенная над зоной ячейка открывает окно
 * ссылкой, и эту ссылку можно прислать, обновить и закрыть кнопкой «назад»
 * (ADR-137). Перетаскивание при этом остаётся ускорителем — тот же адрес
 * открывает кнопка «Переместить» в строке.
 */
export type StockMovePreset = {
  readonly item?: string | undefined;
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly kind?: StockMoveKind | undefined;
};

/** Параметры адреса окна. Пустое не уезжает: `?from=` ничего не выбирает. */
export function stockMoveQuery(preset: StockMovePreset = {}): Record<string, string> {
  const item = preset.item?.trim() ?? '';
  const from = preset.from?.trim() ?? '';
  const to = preset.to?.trim() ?? '';

  return {
    ...(item === '' ? {} : { item }),
    ...(from === '' ? {} : { from }),
    ...(to === '' ? {} : { to }),
    ...(preset.kind === undefined ? {} : { kind: preset.kind }),
  };
}

/**
 * Тот же адрес строкой — для мягкого перехода.
 *
 * Тип литеральный, а не `string`: маршруты проекта типизированы, и обычная
 * строка компилятору ничего не обещает.
 */
export type StockMoveHref = typeof STOCK_MOVE_PATH | `${typeof STOCK_MOVE_PATH}?${string}`;

export function stockMovePath(preset: StockMovePreset = {}): StockMoveHref {
  const query = new URLSearchParams(stockMoveQuery(preset)).toString();
  return query === '' ? STOCK_MOVE_PATH : `${STOCK_MOVE_PATH}?${query}`;
}

/**
 * Поля формы движения из параметров адреса.
 *
 * Вид угадывается по тому, что пришло: с зоной-источником это перемещение, без
 * неё — приход. Явный `kind` в адресе сильнее догадки, но чужие виды не
 * принимаются: списание и возврат заводятся из наряда, где известна работа
 * (docs/API.md §14).
 */
export function moveDraftOf(params: {
  readonly item?: string | undefined;
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly kind?: string | undefined;
}): StockMoveDraft {
  const from = params.from?.trim() ?? '';
  const to = params.to?.trim() ?? '';
  const raw = params.kind?.trim() ?? '';
  const asked = isStockMoveKind(raw) && STOCK_SECTION_MOVES.includes(raw) ? raw : undefined;
  const kind: StockMoveKind = asked ?? (from === '' ? 'income' : 'transfer');

  return {
    kind,
    itemId: params.item?.trim() ?? '',
    qty: '',
    /* Зона-источник есть только у перемещения: у прихода и инвентаризации
       сервер её не ждёт и разбирать не должен. */
    fromZoneId: kind === 'transfer' ? from : '',
    toZoneId: to,
    serials: '',
    reason: '',
  };
}

/**
 * Тело движения по виду: у каждого свой набор полей.
 *
 * Собирается здесь, а не в компоненте: то же тело проверяет клиентская
 * подсказка и отправляет `lib.ts`, и разойтись им нельзя.
 */
export function moveBody(draft: StockMoveDraft): Record<string, string> {
  const common = { itemId: draft.itemId, qty: draft.qty };

  switch (draft.kind) {
    case 'income':
      return {
        kind: draft.kind,
        ...common,
        toZoneId: draft.toZoneId,
        serials: draft.serials,
        reason: draft.reason,
      };
    case 'transfer':
      return {
        kind: draft.kind,
        ...common,
        fromZoneId: draft.fromZoneId,
        toZoneId: draft.toZoneId,
        reason: draft.reason,
      };
    case 'count':
      return { kind: draft.kind, ...common, toZoneId: draft.toZoneId, reason: draft.reason };
    /* Списание и возврат заводятся из наряда: там известен сам наряд. */
    case 'consume':
      return { kind: draft.kind, ...common, fromZoneId: draft.fromZoneId, serials: draft.serials };
    case 'return':
      return { kind: draft.kind, ...common, toZoneId: draft.toZoneId, reason: draft.reason };
  }
}

/** Ошибка поля: то, что показывается под самим полем. */
export type FieldIssue = { readonly field: string; readonly message: string };

/**
 * Мгновенная подсказка на клиенте — той же схемой, что проверяет сервер.
 *
 * 🔴 Клиентская проверка это UX, а не защита: сервер разбирает то же тело
 * заново. Но «Инвентаризация без основания не проводится» человек должен
 * прочитать до отправки, а не после круга через сеть.
 */
export function checkMove(draft: StockMoveDraft): FieldIssue | null {
  const parsed = stockMovementCreateSchema.safeParse(moveBody(draft));
  if (parsed.success) return null;

  const issue = parsed.error.issues[0];
  if (issue === undefined) return null;

  return { field: String(issue.path[0] ?? ''), message: issue.message };
}

/** Та же мгновенная подсказка для позиции справочника. */
export function checkItem(draft: StockItemDraft, editing: boolean): FieldIssue | null {
  const body = {
    name: draft.name,
    group: draft.group,
    unit: draft.unit,
    minQty: draft.minQty,
    productId: draft.productId,
    note: draft.note,
    ...(editing ? { archived: draft.archived } : {}),
  };

  const schema = editing ? stockItemUpdateSchema : stockItemCreateSchema;
  const parsed = schema.safeParse(body);
  if (parsed.success) return null;

  const issue = parsed.error.issues[0];
  if (issue === undefined) return null;

  return { field: String(issue.path[0] ?? ''), message: issue.message };
}

/**
 * Та же мгновенная подсказка для зоны.
 *
 * 🔴 Ровно здесь ловится «машина без хозяина» и «склад с хозяином»: правило
 * живёт в схеме контракта, и интерфейс не заводит своей копии.
 */
export function checkZone(draft: StockZoneDraft, editing: boolean): FieldIssue | null {
  const body = {
    kind: draft.kind,
    name: draft.name,
    userId: draft.userId,
    sort: draft.sort === '' ? 0 : draft.sort,
    ...(editing ? { archived: draft.archived } : {}),
  };

  const schema = editing ? stockZoneUpdateSchema : stockZoneCreateSchema;
  const parsed = schema.safeParse(body);
  if (parsed.success) return null;

  const issue = parsed.error.issues[0];
  if (issue === undefined) return null;

  return { field: String(issue.path[0] ?? ''), message: issue.message };
}

/* ---------- Остаток в таблице ---------- */

/**
 * Остаток позиции в зоне. Нулевая зона приходит нулём, но ключа может и не
 * быть: `byZone` — обычный объект, и полагаться на его полноту нельзя.
 */
export function zoneQty(item: StockItemCard, zoneId: string): number {
  return item.byZone[zoneId] ?? 0;
}

/**
 * Склад разошёлся с реальностью: где-то минус.
 *
 * 🔴 Это предупреждение, а не ошибка (ADR-134): запрет ухода в минус означает,
 * что монтажник впишет неправду, лишь бы закрыть наряд.
 */
export function hasShortage(item: StockItemCard, zones: readonly StockZoneCard[]): boolean {
  return item.total < 0 || zones.some((zone) => zoneQty(item, zone.id) < 0);
}

/* ---------- Действия раздела ---------- */

/**
 * Действия вынесены интерфейсом: истории и тесты подставляют свои, не поднимая
 * сеть.
 */
export type StockApi = {
  readonly createItem: (draft: StockItemDraft) => Promise<StockResult>;
  readonly updateItem: (id: string, draft: StockItemDraft) => Promise<StockResult>;
  /** Позиция не удаляется, а сдаётся в архив: удаление унесло бы историю. */
  readonly archiveItem: (id: string) => Promise<StockResult>;
  readonly createZone: (draft: StockZoneDraft) => Promise<StockResult>;
  readonly updateZone: (id: string, draft: StockZoneDraft) => Promise<StockResult>;
  readonly archiveZone: (id: string) => Promise<StockResult>;
  readonly move: (draft: StockMoveDraft) => Promise<StockResult>;
};

/** Страница журнала движений — та же разбивка, что у остальных списков панели. */
export type StockMovementPage = Page<StockMovementCard>;
