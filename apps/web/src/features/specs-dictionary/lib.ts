/** Сохранение справочника — контракт docs/API.md §5 (группа настроек `specs`). */
import { specsDictionaryContent as texts } from './content';
import type { SpecDictionaryDraft, SpecsSaveResult } from './model';

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
  try {
    const response = await fetch('/api/admin/settings/specs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toRequestBody(value)),
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
