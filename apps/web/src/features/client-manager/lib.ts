/** Действия раздела клиентов — контракт docs/API.md §12. */
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { clientManagerContent as texts } from './content';
import type { ClientApi, ClientDraft, ClientResult, ClientUnitApi, ClientUnitDraft } from './model';

const REQUEST_TEXTS = {
  ...ADMIN_API_TEXTS,
  network: texts.networkError,
  server: texts.serverError,
};

/** Пустое поле формы — это «не заполнено», а не пустая строка в базе. */
function body(draft: ClientDraft): Record<string, string> {
  return {
    name: draft.name,
    phone: draft.phone,
    address: draft.address,
    note: draft.note,
  };
}

async function send(url: string, init: RequestInit): Promise<ClientResult> {
  // общий разбор ответа (ADR-030): 401 обязан отличаться от отказа сервера
  const result = await adminRequest(url, init, REQUEST_TEXTS);
  if (result.ok) return { ok: true };

  return {
    ok: false,
    message: result.message,
    ...(result.field === undefined ? {} : { field: result.field }),
  };
}

export const clientApi: ClientApi = {
  create: (draft) => send('/api/admin/clients', jsonInit('POST', body(draft))),

  update: (id, draft) => send(`/api/admin/clients/${id}`, jsonInit('PATCH', body(draft))),

  remove: (id) => send(`/api/admin/clients/${id}`, jsonInit('DELETE')),
};

/** Пустая дата гарантии — это «не записана», а не сегодняшнее число. */
function unitBody(draft: ClientUnitDraft): Record<string, string> {
  return {
    model: draft.model,
    installedAt: draft.installedAt,
    warrantyUntil: draft.warrantyUntil,
  };
}

export const clientUnitApi: ClientUnitApi = {
  create: (clientId, draft) =>
    send(`/api/admin/clients/${clientId}/units`, jsonInit('POST', unitBody(draft))),

  update: (clientId, unitId, draft) =>
    send(`/api/admin/clients/${clientId}/units/${unitId}`, jsonInit('PATCH', unitBody(draft))),

  remove: (clientId, unitId) =>
    send(`/api/admin/clients/${clientId}/units/${unitId}`, jsonInit('DELETE')),
};
