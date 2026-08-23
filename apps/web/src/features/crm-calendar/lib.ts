/** Правка календаря — маршруты `/api/admin/crm`. */
import type { CrmEventStatus } from '@/entities/crm/model';

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
  try {
    const response = await fetch(url, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });

    if (response.ok) return { ok: true };

    const payload: unknown = await response.json().catch(() => null);
    const error = (payload as { error?: { message?: unknown } } | null)?.error;

    return {
      ok: false,
      message: typeof error?.message === 'string' ? error.message : texts.failure,
    };
  } catch {
    return { ok: false, message: texts.failure };
  }
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
