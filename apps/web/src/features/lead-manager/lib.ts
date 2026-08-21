/** Правка заявки — контракт docs/API.md §8. */
import { leadManagerContent as texts } from './content';
import type { LeadPatch, LeadUpdateResult } from './model';

export async function patchLead(id: string, patch: LeadPatch): Promise<LeadUpdateResult> {
  try {
    const response = await fetch(`/api/admin/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (response.ok) return { ok: true };

    const payload: unknown = await response.json().catch(() => null);
    const error = (payload as { error?: { message?: unknown } } | null)?.error;

    return {
      ok: false,
      message: typeof error?.message === 'string' ? error.message : texts.serverError,
    };
  } catch {
    return { ok: false, message: texts.networkError };
  }
}
