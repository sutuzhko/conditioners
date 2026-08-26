/** Действия раздела заказов — контракт docs/API.md §13. */
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, createdSchema, jsonInit } from '@/shared/lib/api';

import { orderManagerContent as texts } from './content';
import { orderPayload, type OrderApi, type OrderResult } from './model';

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
