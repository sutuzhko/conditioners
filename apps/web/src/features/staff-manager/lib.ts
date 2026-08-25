/** Действия раздела команды — контракт docs/API.md §11. */
import { staffManagerContent as texts } from './content';
import type { StaffApi, StaffDraft, StaffResult } from './model';

async function send(url: string, method: string, body?: unknown): Promise<StaffResult> {
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
      message: typeof error?.message === 'string' ? error.message : texts.serverError,
    };
  } catch {
    return { ok: false, message: texts.networkError };
  }
}

export const staffApi: StaffApi = {
  create: (draft: StaffDraft) =>
    send('/api/admin/staff', 'POST', {
      name: draft.name,
      login: draft.login,
      phone: draft.phone,
      password: draft.password,
    }),

  update: (id, patch) => send(`/api/admin/staff/${id}`, 'PATCH', patch),

  remove: (id) => send(`/api/admin/staff/${id}`, 'DELETE'),

  addNote: (id, text) => send(`/api/admin/staff/${id}/notes`, 'POST', { text }),

  removeNote: (id, noteId) => send(`/api/admin/staff/${id}/notes/${noteId}`, 'DELETE'),
};
