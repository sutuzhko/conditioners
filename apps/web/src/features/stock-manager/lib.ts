/** Действия раздела склада — контракт docs/API.md §14. */
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { stockManagerContent as texts } from './content';
import {
  moveBody,
  type StockApi,
  type StockItemDraft,
  type StockMoveDraft,
  type StockResult,
  type StockZoneDraft,
} from './model';

const REQUEST_TEXTS = {
  ...ADMIN_API_TEXTS,
  network: texts.networkError,
  server: texts.serverError,
};

async function send(url: string, init: RequestInit): Promise<StockResult> {
  /* Общий разбор ответа (ADR-030): 401 обязан отличаться от отказа сервера —
     иначе владелец с истёкшей сессией правит форму вместо того, чтобы войти. */
  const result = await adminRequest(url, init, REQUEST_TEXTS);
  if (result.ok) return { ok: true };

  return {
    ok: false,
    message: result.message,
    ...(result.field === undefined ? {} : { field: result.field }),
  };
}

/**
 * Тело позиции. Пустая строка в необязательном поле — это «не заполнено»:
 * превращать её в `null` умеет схема контракта, и делать это дважды незачем.
 */
function itemBody(draft: StockItemDraft): Record<string, string | boolean> {
  return {
    name: draft.name,
    group: draft.group,
    unit: draft.unit,
    minQty: draft.minQty,
    productId: draft.productId,
    note: draft.note,
  };
}

function zoneBody(draft: StockZoneDraft): Record<string, string> {
  return {
    kind: draft.kind,
    name: draft.name,
    userId: draft.userId,
    sort: draft.sort === '' ? '0' : draft.sort,
  };
}

export const stockApi: StockApi = {
  createItem: (draft) => send('/api/admin/stock/items', jsonInit('POST', itemBody(draft))),

  updateItem: (id, draft) =>
    send(
      `/api/admin/stock/items/${id}`,
      jsonInit('PATCH', { ...itemBody(draft), archived: draft.archived }),
    ),

  /* Архивирование, а не удаление: журнал движений остаётся (ADR-134). */
  archiveItem: (id) => send(`/api/admin/stock/items/${id}`, jsonInit('DELETE')),

  createZone: (draft) => send('/api/admin/stock/zones', jsonInit('POST', zoneBody(draft))),

  updateZone: (id, draft) =>
    send(
      `/api/admin/stock/zones/${id}`,
      jsonInit('PATCH', { ...zoneBody(draft), archived: draft.archived }),
    ),

  archiveZone: (id) => send(`/api/admin/stock/zones/${id}`, jsonInit('DELETE')),

  move: (draft: StockMoveDraft) =>
    send('/api/admin/stock/movements', jsonInit('POST', moveBody(draft))),
};
