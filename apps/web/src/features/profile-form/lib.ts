/** Правка своего профиля — контракт docs/API.md §11. */
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { profileFormContent as texts } from './content';
import type { ProfileApi, ProfileResult } from './model';

const REQUEST_TEXTS = {
  ...ADMIN_API_TEXTS,
  network: texts.networkError,
  server: texts.serverError,
};

async function send(url: string, init: RequestInit): Promise<ProfileResult> {
  /* 🔴 Общий разбор ответа (ADR-030), а не своя копия с приведением типа.
     Копия не отличала 401 от отказа сервера, и владелец с истёкшей сессией
     читал «сервер не принял изменения» вместо «войдите заново» — на экране
     смены пароля это худшая из возможных подмен: человек начнёт подбирать
     пароль вместо того, чтобы войти заново. */
  const result = await adminRequest(url, init, REQUEST_TEXTS);
  if (result.ok) return { ok: true };

  return { ok: false, message: result.message };
}

export const profileApi: ProfileApi = {
  save: (patch) => send('/api/admin/profile', jsonInit('PATCH', patch)),
  changePassword: (input) => send('/api/admin/profile/password', jsonInit('POST', input)),
};
