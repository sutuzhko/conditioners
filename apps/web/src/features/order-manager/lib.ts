/** Действия раздела заказов — контракт docs/API.md §13. */
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, createdSchema, jsonInit } from '@/shared/lib/api';

import { orderManagerContent as texts } from './content';
import {
  orderPayload,
  type OrderApi,
  type OrderDocKind,
  type OrderResult,
  type OrderResultDraft,
  type OrderWorkApi,
  type PhotoStage,
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
     заведении статус не отправляется вовсе — его назначает сервер. */
  update: (id, draft) =>
    send(`${API_PATH}/${id}`, jsonInit('PATCH', { ...orderPayload(draft), status: draft.status })),

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
