/** Действия раздела команды — контракт docs/API.md §11. */
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { staffManagerContent as texts } from './content';
import type { StaffApi, StaffDraft, StaffResult } from './model';

const REQUEST_TEXTS = {
  ...ADMIN_API_TEXTS,
  network: texts.networkError,
  server: texts.serverError,
};

async function send(url: string, init: RequestInit): Promise<StaffResult> {
  /* Общий разбор ответа (ADR-030): своя копия здесь не отличала 401 от отказа
     сервера, и владелец с истёкшей сессией читал «сервер не принял
     изменения» вместо «войдите заново». Заодно наружу выходит `field` —
     без него «логин занят» не подсвечивает поле логина. */
  const result = await adminRequest(url, init, REQUEST_TEXTS);
  if (result.ok) return { ok: true };

  return {
    ok: false,
    message: result.message,
    ...(result.field === undefined ? {} : { field: result.field }),
  };
}

export const staffApi: StaffApi = {
  create: (draft: StaffDraft) =>
    send(
      '/api/admin/staff',
      jsonInit('POST', {
        name: draft.name,
        login: draft.login,
        phone: draft.phone,
        employment: draft.employment,
        password: draft.password,
      }),
    ),

  update: (id, patch) => send(`/api/admin/staff/${id}`, jsonInit('PATCH', patch)),

  remove: (id) => send(`/api/admin/staff/${id}`, jsonInit('DELETE')),

  addNote: (id, text) => send(`/api/admin/staff/${id}/notes`, jsonInit('POST', { text })),

  removeNote: (id, noteId) => send(`/api/admin/staff/${id}/notes/${noteId}`, jsonInit('DELETE')),
};
