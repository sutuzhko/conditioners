/** Правка заявки — контракт docs/API.md §8. */
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { leadManagerContent as texts } from './content';
import type { LeadPatch, LeadUpdateResult } from './model';

export async function patchLead(id: string, patch: LeadPatch): Promise<LeadUpdateResult> {
  // общий разбор ответа (ADR-030): свои остаются только формулировки фичи
  const result = await adminRequest(`/api/admin/leads/${id}`, jsonInit('PATCH', patch), {
    ...ADMIN_API_TEXTS,
    network: texts.networkError,
    server: texts.serverError,
  });

  return result.ok ? { ok: true } : { ok: false, message: result.message };
}
