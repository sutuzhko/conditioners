/** Правка календаря — маршруты `/api/admin/crm`. */
import type { CrmEventStatus } from '@/entities/crm/model';
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { crmContent as texts } from './content';
import type { CrmEventDraft, CrmResult } from './model';

/** Пустое поле формы уходит на сервер пустой строкой — там она станет «не заполнено». */
function payloadOf(draft: CrmEventDraft): Record<string, string | null> {
  return {
    kind: draft.kind,
    day: draft.day,
    time: draft.time,
    clientName: draft.clientName,
    clientPhone: draft.clientPhone,
    address: draft.address,
    note: draft.note,
    leadId: draft.leadId,
  };
}

async function send(url: string, method: string, body?: unknown): Promise<CrmResult> {
  // общий разбор ответа (ADR-030): свои остаются только формулировки фичи
  const result = await adminRequest(url, jsonInit(method, body), {
    ...ADMIN_API_TEXTS,
    network: texts.failure,
    server: texts.failure,
  });

  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

export function createEvent(draft: CrmEventDraft): Promise<CrmResult> {
  return send('/api/admin/crm', 'POST', payloadOf(draft));
}

export function updateEvent(id: string, draft: CrmEventDraft): Promise<CrmResult> {
  return send(`/api/admin/crm/${id}`, 'PATCH', payloadOf(draft));
}

/** Отдельно от правки: статус меняется одним нажатием прямо в списке. */
export function setEventStatus(id: string, status: CrmEventStatus): Promise<CrmResult> {
  return send(`/api/admin/crm/${id}`, 'PATCH', { status });
}

export function removeEvent(id: string): Promise<CrmResult> {
  return send(`/api/admin/crm/${id}`, 'DELETE');
}
