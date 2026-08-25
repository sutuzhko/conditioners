/** Правка своего профиля — контракт docs/API.md §11. */
import { profileFormContent as texts } from './content';
import type { ProfileApi, ProfileResult } from './model';

async function send(url: string, method: string, body: unknown): Promise<ProfileResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

export const profileApi: ProfileApi = {
  save: (patch) => send('/api/admin/profile', 'PATCH', patch),
  changePassword: (input) => send('/api/admin/profile/password', 'POST', input),
};
