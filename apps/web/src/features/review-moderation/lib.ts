/** Запросы модерации — контракт docs/API.md §7. */
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { reviewModerationContent as texts } from './content';
import type { ReviewActionResult, ReviewApi, ReviewStatus } from './model';

/* Общий разбор ответа (ADR-030): фича оставляет только свои формулировки. */
const MODERATION_TEXTS = {
  ...ADMIN_API_TEXTS,
  network: texts.networkError,
  server: texts.serverError,
};

async function send(url: string, init: RequestInit): Promise<ReviewActionResult> {
  const result = await adminRequest(url, init, MODERATION_TEXTS);
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

export const reviewApi: ReviewApi = {
  setStatus(id: string, status: ReviewStatus): Promise<ReviewActionResult> {
    return send(`/api/admin/reviews/${id}/status`, jsonInit('PATCH', { status }));
  },

  remove(id: string): Promise<ReviewActionResult> {
    return send(`/api/admin/reviews/${id}`, { method: 'DELETE' });
  },
};
