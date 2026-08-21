/** Запросы модерации — контракт docs/API.md §7. */
import { reviewModerationContent as texts } from './content';
import type { ReviewActionResult, ReviewApi, ReviewStatus } from './model';

function readMessage(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) return undefined;
  const { message } = error as Record<string, unknown>;
  return typeof message === 'string' ? message : undefined;
}

export const reviewApi: ReviewApi = {
  async setStatus(id: string, status: ReviewStatus): Promise<ReviewActionResult> {
    try {
      const response = await fetch(`/api/admin/reviews/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) return { ok: true };

      const payload: unknown = await response.json().catch(() => null);
      return { ok: false, message: readMessage(payload) ?? texts.serverError };
    } catch {
      return { ok: false, message: texts.networkError };
    }
  },

  async remove(id: string): Promise<ReviewActionResult> {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      return response.ok ? { ok: true } : { ok: false, message: texts.serverError };
    } catch {
      return { ok: false, message: texts.networkError };
    }
  },
};
