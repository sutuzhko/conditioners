/** Правка заявки — контракт docs/API.md §8, §12. */
import { z } from 'zod';

import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { leadManagerContent as texts } from './content';
import type { LeadPatch, LeadToClientResult, LeadUpdateResult } from './model';

const REQUEST_TEXTS = {
  ...ADMIN_API_TEXTS,
  network: texts.networkError,
  server: texts.serverError,
};

export async function patchLead(id: string, patch: LeadPatch): Promise<LeadUpdateResult> {
  // общий разбор ответа (ADR-030): свои остаются только формулировки фичи
  const result = await adminRequest(`/api/admin/leads/${id}`, jsonInit('PATCH', patch), {
    ...REQUEST_TEXTS,
  });

  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

/**
 * Ответ сервера приходит снаружи, значит разбирается схемой, а не приведением
 * типа: `created` управляет тем, что владелец прочитает на экране.
 */
const clientResultSchema = z.object({
  client: z.object({ id: z.string().min(1) }),
  created: z.boolean(),
});

/** «В клиенты»: обращение становится карточкой человека или привязывается к ней. */
export async function leadToClient(id: string): Promise<LeadToClientResult> {
  const result = await adminRequest(
    `/api/admin/leads/${id}/client`,
    jsonInit('POST'),
    REQUEST_TEXTS,
  );

  if (!result.ok) return { ok: false, message: result.message };

  const parsed = clientResultSchema.safeParse(result.payload);
  if (!parsed.success) return { ok: false, message: texts.serverError };

  return { ok: true, clientId: parsed.data.client.id, created: parsed.data.created };
}
