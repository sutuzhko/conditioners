/** Действия раздела заказов — контракт docs/API.md §13. */
import { orderPairIssue } from '@/entities/order/model';
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, createdSchema, jsonInit } from '@/shared/lib/api';

import { orderManagerContent as texts } from './content';
import {
  orderConsumptionSchema,
  orderPayload,
  stockOverviewSchema,
  type ConsumptionLine,
  type ConsumptionLoad,
  type OrderApi,
  type OrderConsumptionApi,
  type OrderDocKind,
  type OrderResult,
  type OrderResultDraft,
  type OrderWorkApi,
  type PhotoStage,
  type StockItemCard,
  type StockMovementCard,
  type StockZoneCard,
} from './model';

const REQUEST_TEXTS = {
  ...ADMIN_API_TEXTS,
  network: texts.networkError,
  server: texts.serverError,
};

const API_PATH = '/api/admin/orders';

async function send(url: string, init: RequestInit): Promise<OrderResult> {
  // общий разбор ответа (ADR-030): 401 обязан отличаться от отказа сервера
  const result = await adminRequest(url, init, REQUEST_TEXTS);

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      ...(result.field === undefined ? {} : { field: result.field }),
    };
  }

  /* Заведение отдаёт наряд целиком; страница уходит в него по номеру записи.
     Правка и удаление номера не возвращают — это не ошибка, а другой ответ. */
  const created = createdSchema.safeParse(result.payload);
  return created.success ? { ok: true, id: created.data.id } : { ok: true };
}

export const orderApi: OrderApi = {
  create: (draft) => send(API_PATH, jsonInit('POST', orderPayload(draft))),

  /* Статус приезжает вместе с остальными полями: правка наряда и перевод его
     в работу — одно действие владельца, а не два запроса подряд. При
     заведении статус не отправляется вовсе — его назначает сервер.

     🔴 Кроме одного случая: когда статус в форме спорит с исполнителем. Так
     выглядит обычное действие владельца — открыть наряд «Новый», выбрать
     монтажника и сохранить: `select` статуса он не трогал, и прислать
     оттуда «Новый» значило бы попросить сервер оставить наряд «Новым» с
     исполнителем. Такую пару сервер отвергает, поэтому статус в этом случае
     не отправляется вовсе, и его выводит за исполнителем репозиторий. */
  update: (id, draft) => {
    const conflicts = orderPairIssue(draft.status, draft.installerId.trim() !== '') !== null;

    return send(
      `${API_PATH}/${id}`,
      jsonInit('PATCH', {
        /* 🔴 Версия карточки, с которой её открыли. Сервер сравнит её с тем,
           что в базе, и откажет, если за это время карточку изменил кто-то
           другой (BUGS §1864). Без этого поля форма шлёт все поля разом в том
           виде, в каком их загрузили, и стирает чужую правку молча. */
        ...(draft.updatedAt === '' ? {} : { updatedAt: draft.updatedAt }),
        ...orderPayload(draft),
        ...(conflicts ? {} : { status: draft.status }),
      }),
    );
  },

  remove: (id) => send(`${API_PATH}/${id}`, jsonInit('DELETE')),

  setStatus: (id, status) => send(`${API_PATH}/${id}`, jsonInit('PATCH', { status })),
};

/**
 * Действия наряда в работе — docs/API.md §13.
 *
 * Свой набор на каждый наряд: номер наряда не тащится в каждый вызов
 * компонента, а адреса собираются в одном месте.
 *
 * Загрузки уходят формой, а не JSON: сервер сам проверяет настоящий тип
 * файла и сам придумывает ему имя на диске.
 */
export function orderWorkApi(orderId: string): OrderWorkApi {
  const base = `${API_PATH}/${orderId}`;

  const upload = async (url: string, data: FormData): Promise<OrderResult> =>
    send(url, { method: 'POST', body: data });

  return {
    saveResult: (draft: OrderResultDraft) =>
      send(
        `${base}/result`,
        jsonInit('PATCH', { extraWork: draft.extraWork, report: draft.report }),
      ),

    addItem: (text: string) => send(`${base}/checklist`, jsonInit('POST', { text })),

    setItemDone: (itemId: string, done: boolean) =>
      send(`${base}/checklist/${itemId}`, jsonInit('PATCH', { done })),

    removeItem: (itemId: string) => send(`${base}/checklist/${itemId}`, jsonInit('DELETE')),

    /* Пересборка приводит чеклист к тому, что говорит наряд, — это замена
       коллекции, а не новое событие, поэтому PUT. */
    rebuildChecklist: () => send(`${base}/checklist`, jsonInit('PUT')),

    addDoc: (kind: OrderDocKind, file: File) => {
      const data = new FormData();
      data.append('file', file);
      data.append('kind', kind);
      return upload(`${base}/docs`, data);
    },

    removeDoc: (docId: string) => send(`${base}/docs/${docId}`, jsonInit('DELETE')),

    addPhoto: (stage: PhotoStage, file: File) => {
      const data = new FormData();
      data.append('photo', file);
      data.append('stage', stage);
      return upload(`${base}/photos`, data);
    },

    removePhoto: (photoId: string) => send(`${base}/photos/${photoId}`, jsonInit('DELETE')),
  };
}

/**
 * Расход материалов по наряду — docs/API.md §14.
 *
 * 🔴 Ответы разбираются схемой, а не приведением типа: остатки склада
 * приходят снаружи. Владельческих ключей позиции схема не знает вовсе —
 * монтажнику их не кладут в ответ, и разбор, который их ждёт, однажды
 * покажет то, чего показывать нельзя (ADR-134).
 */
const STOCK_PATH = '/api/admin/stock';

/**
 * Сколько страниц справочника поднимаем под форму списания.
 *
 * Справочник отдаётся по двадцать позиций, а выбирать из него нужно целиком:
 * искать позицию запросом на каждую букву значит гонять сеть из машины по
 * мобильному интернету. Потолок существует, чтобы разросшийся справочник не
 * превратил открытие наряда в двадцать запросов.
 */
const MAX_STOCK_PAGES = 10;

type StockPage = {
  readonly zones: readonly StockZoneCard[];
  readonly items: readonly StockItemCard[];
  readonly pages: number;
};

async function loadStockPage(page: number): Promise<StockPage | null> {
  const result = await adminRequest(`${STOCK_PATH}?page=${page}`, jsonInit('GET'), REQUEST_TEXTS);
  if (!result.ok) return null;

  const parsed = stockOverviewSchema.safeParse(result.payload);
  if (!parsed.success) return null;

  /* Явные типы — сверка с доменным контрактом склада: разъедется схема с
     `entities/stock` — перестанет компилироваться здесь, а не сломается
     молча в разметке. */
  const zones: readonly StockZoneCard[] = parsed.data.zones;
  const items: readonly StockItemCard[] = parsed.data.items;

  return { zones, items, pages: parsed.data.pages };
}

async function loadDirectory(): Promise<StockPage | null> {
  const first = await loadStockPage(1);
  if (first === null) return null;

  const total = Math.min(first.pages, MAX_STOCK_PAGES);
  if (total <= 1) return first;

  const rest = await Promise.all(
    Array.from({ length: total - 1 }, (_, index) => loadStockPage(index + 2)),
  );

  /* Недостающая страница обрывает справочник: показать половину номенклатуры
     как всю — значит заставить списать не то, что списали на самом деле. */
  if (rest.some((page) => page === null)) return null;

  const items = rest.reduce<readonly StockItemCard[]>(
    (all, page) => (page === null ? all : [...all, ...page.items]),
    first.items,
  );

  return { zones: first.zones, items, pages: first.pages };
}

async function loadMoves(base: string): Promise<readonly StockMovementCard[] | null> {
  const result = await adminRequest(base, jsonInit('GET'), REQUEST_TEXTS);
  if (!result.ok) return null;

  const parsed = orderConsumptionSchema.safeParse(result.payload);
  if (!parsed.success) return null;

  const moves: readonly StockMovementCard[] = parsed.data.items;
  return moves;
}

export function orderConsumptionApi(orderId: string): OrderConsumptionApi {
  const base = `${API_PATH}/${orderId}/consumption`;

  return {
    /* Движения и справочник поднимаются вместе: без остатка по зоне форма не
       может предупредить об уходе в минус, а без движений нечего показывать. */
    load: async (): Promise<ConsumptionLoad> => {
      const [moves, stock] = await Promise.all([loadMoves(base), loadDirectory()]);

      if (moves === null || stock === null) {
        return { ok: false, message: texts.consumptionLoadError };
      }

      return { ok: true, moves, stock: { zones: stock.zones, items: stock.items } };
    },

    /* Контракт принимает список строк: форма шлёт одну — списывают по одной
       позиции за раз, и частично принятая пачка объяснялась бы дольше, чем
       повторное нажатие. */
    consume: (line: ConsumptionLine) => send(base, jsonInit('POST', { lines: [line] })),

    /* 🔴 Отмена — возвратом в ту же зону, а не удалением записи: журнал
       движений не переписывается, иначе вопрос «куда делись тридцать метров
       трассы» снова остаётся без ответа. */
    cancel: (moveId: string) => send(`${base}/${moveId}`, jsonInit('DELETE')),
  };
}
