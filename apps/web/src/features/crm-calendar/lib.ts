/** Правка календаря — маршруты `/api/admin/crm` и `/api/admin/blocks`. */
import { minutesOfTime } from '@/entities/crm/lib/busy';
import type { CrmEventStatus } from '@/entities/crm/model';
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { crmContent as texts } from './content';
import type { CrmEventDraft, CrmResult, DayBlockDraft } from './model';

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

async function send(
  url: string,
  method: string,
  body?: unknown,
  failure: string = texts.failure,
): Promise<CrmResult> {
  // общий разбор ответа (ADR-030): свои остаются только формулировки фичи
  const result = await adminRequest(url, jsonInit(method, body), {
    ...ADMIN_API_TEXTS,
    network: failure,
    server: failure,
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

/**
 * Черновик занятости в тело запроса.
 *
 * Форма думает временем и переключателем «весь день», сервер — минутами от
 * полуночи и пустыми границами. Перевод живёт здесь, а не в разметке: то же
 * тело понадобится и правке.
 */
function blockPayloadOf(draft: DayBlockDraft): Record<string, string | number | null> {
  return {
    repeat: draft.repeat,
    // разовая держит дату, повторяемая — день недели; лишнее поле сервер отклонит
    day: draft.repeat === 'once' ? draft.day : null,
    weekday: draft.repeat === 'weekly' ? draft.weekday : null,
    fromMin: draft.allDay ? null : minutesOfTime(draft.from),
    toMin: draft.allDay ? null : minutesOfTime(draft.to),
    reason: draft.reason,
  };
}

export function createBlock(draft: DayBlockDraft): Promise<CrmResult> {
  return send('/api/admin/blocks', 'POST', blockPayloadOf(draft), texts.busyFailure);
}

/** Правка занятости — телом целиком: повтор, день и окно связаны между собой. */
export function updateBlock(id: string, draft: DayBlockDraft): Promise<CrmResult> {
  return send(`/api/admin/blocks/${id}`, 'PATCH', blockPayloadOf(draft), texts.busyFailure);
}

export function removeBlock(id: string): Promise<CrmResult> {
  return send(`/api/admin/blocks/${id}`, 'DELETE', undefined, texts.busyRemoveFailure);
}
