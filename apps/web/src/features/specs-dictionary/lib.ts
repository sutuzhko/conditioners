/** Сохранение справочника — контракт docs/API.md §5 (группа настроек `specs`). */
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { specsDictionaryContent as texts } from './content';
import type { SpecDictionaryDraft, SpecsSaveResult } from './model';

const REQUEST_TEXTS = {
  ...ADMIN_API_TEXTS,
  network: texts.networkError,
  server: texts.serverError,
};

/**
 * Пустая строка — это забытое поле, а не характеристика: в карточке товара
 * она стала бы заголовком без названия. Группа без названия и без полей
 * отбрасывается целиком.
 */
export function toRequestBody(value: SpecDictionaryDraft): Record<string, unknown> {
  const groups = value.groups
    .map((group) => ({
      title: group.title.trim(),
      fields: group.fields
        .filter((field) => field.k.trim() !== '')
        .map((field) => ({
          k: field.k.trim(),
          unit: field.unit.trim(),
          hint: field.hint.trim(),
        })),
    }))
    .filter((group) => group.title !== '' && group.fields.length > 0);

  return { groups };
}

export async function putSpecs(value: SpecDictionaryDraft): Promise<SpecsSaveResult> {
  /* 🔴 Общий разбор ответа (ADR-030), а не своя копия с приведением типа:
     копия не отличала истёкшую сессию от отказа сервера, и владелец, потерявший
     сессию за правкой справочника, читал «сервер не принял изменения» вместо
     «войдите заново» — и правил бы дальше в пустоту. */
  const result = await adminRequest(
    '/api/admin/settings/specs',
    jsonInit('PUT', toRequestBody(value)),
    REQUEST_TEXTS,
  );

  return result.ok ? { ok: true } : { ok: false, message: result.message };
}
